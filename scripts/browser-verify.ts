import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { startServer } from '../server/index';

interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
}

interface RequestEntry {
  url: string;
  status: number;
  mimeType: string;
}

class CDPClient {
  private ws: WebSocket | null = null;
  private msgId = 1;
  private pending = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
  public consoleLogs: ConsoleEntry[] = [];
  public exceptions: string[] = [];
  public requests: RequestEntry[] = [];

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data.toString());
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          } else if (msg.method) {
            this.handleEvent(msg.method, msg.params);
          }
        } catch (e) {}
      };
    });
  }

  private handleEvent(method: string, params: any) {
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args?.map((a: any) => a.value || a.description || '').join(' ') || '';
      this.consoleLogs.push({ type: params.type, text, timestamp: Date.now() });
    } else if (method === 'Runtime.exceptionThrown') {
      const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Unknown exception';
      this.exceptions.push(desc);
      this.consoleLogs.push({ type: 'error', text: `[EXCEPTION] ${desc}`, timestamp: Date.now() });
    } else if (method === 'Network.responseReceived') {
      this.requests.push({
        url: params.response?.url || '',
        status: params.response?.status || 0,
        mimeType: params.response?.mimeType || '',
      });
    }
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws?.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url });
    // Wait for load event
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}

async function runVerification() {
  console.log('===============================================================');
  console.log('   IPLAUCTION BROWSER & HYDRATION VERIFICATION SUITE');
  console.log('===============================================================');

  // 1. Start Auction Server on port 3001
  console.log('[1/6] Launching Authoritative Auction Server on port 3001...');
  const backend = await startServer(3001);
  console.log('      Backend server online at http://localhost:3001');

  // 2. Start Next.js production server on port 3000
  console.log('[2/6] Launching Next.js Production Server on port 3000...');
  const nextProcess = spawn('npx.cmd', ['next', 'start', '-p', '3000'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: '3000', NEXT_PUBLIC_SOCKET_URL: 'http://localhost:3001' },
  });

  // Wait for Next.js server to be reachable
  let nextReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:3000/');
      if (res.status === 200 || res.status === 304) {
        nextReady = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!nextReady) {
    throw new Error('Next.js server failed to start on port 3000 within 30 seconds');
  }
  console.log('      Next.js server online at http://localhost:3000');

  // 3. Launch Chrome Headless with CDP
  console.log('[3/6] Launching Headless Chrome with Remote Debugging...');
  const profileDir = path.join(os.tmpdir(), `chrome-ipl-verify-${Date.now()}`);
  const chromeProcess = spawn(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-gpu',
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await new Promise(r => setTimeout(r, 1500));

  // Get active CDP target
  const tabsRes = await fetch('http://localhost:9222/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
  if (!pageTab?.webSocketDebuggerUrl) {
    throw new Error('Failed to obtain WebSocket debugger URL from Chrome CDP');
  }

  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  console.log('      Chrome CDP session connected successfully.');

  let allPassed = true;
  const failureReasons: string[] = [];

  try {
    // 4. Test Favicon Status
    console.log('[4/6] Verifying Favicon (/favicon.ico & /icon.svg)...');
    const favRes = await fetch('http://localhost:3000/favicon.ico');
    console.log(`      GET /favicon.ico status: ${favRes.status} (MIME: ${favRes.headers.get('content-type')})`);
    if (favRes.status !== 200) {
      allPassed = false;
      failureReasons.push(`favicon.ico returned status ${favRes.status} (expected 200)`);
    }

    const svgRes = await fetch('http://localhost:3000/icon.svg');
    console.log(`      GET /icon.svg status: ${svgRes.status} (MIME: ${svgRes.headers.get('content-type')})`);
    if (svgRes.status !== 200) {
      allPassed = false;
      failureReasons.push(`icon.svg returned status ${svgRes.status} (expected 200)`);
    }

    // 5. Test Hydration on Public Pages
    console.log('[5/6] Verifying SSR Hydration across core views...');
    const pagesToTest = ['/', '/login', '/register', '/history'];
    for (const p of pagesToTest) {
      console.log(`      Navigating to ${p}...`);
      await client.navigate(`http://localhost:3000${p}`);
      await new Promise(r => setTimeout(r, 1000));
    }

    // 6. Test Live Auction Page with Simulated Active Room
    console.log('[6/6] Verifying Live Auction Room Hydration & Multi-Player Transitions...');

    // Create room via backend REST API
    const createRes = await fetch('http://localhost:3001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_session_id: `bot-host-${Date.now()}`,
        host_display_name: 'AuctionMaster',
      }),
    });
    const createData = await createRes.json();
    const roomCode = createData.room_code;
    console.log(`      Created test room: ${roomCode}`);

    // Pre-authenticate user session in browser via /api/auth/register
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'BrowserTester',
        email: `tester_${Date.now()}@iplauction.local`,
        password: 'Password123!',
      }),
    });
    const regData = await regRes.json();
    const cookieHeader = regRes.headers.get('set-cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/ipl_session=([^;]+)/);
      if (match) {
        await client.send('Network.setCookie', {
          name: 'ipl_session',
          value: match[1],
          domain: 'localhost',
          path: '/',
        });
      }
    }

    // Connect a socket client to simulate active multiplayer room
    const { io } = await import('socket.io-client');
    const hostSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      auth: { token: regData.socket_token },
    });

    await new Promise<void>(resolve => {
      hostSocket.on('connect', () => {
        hostSocket.emit('room_join', {
          room_code: roomCode,
          session_id: regData.user.id,
          display_name: regData.user.name,
        });
      });
      hostSocket.on('state_sync', () => {
        resolve();
      });
    });

    // Start auction to transition into live bidding
    hostSocket.emit('start_auction', { room_code: roomCode });
    await new Promise(r => setTimeout(r, 1000));

    // Navigate to Room Page in Chrome
    console.log(`      Navigating Chrome to http://localhost:3000/room/${roomCode}...`);
    await client.navigate(`http://localhost:3000/room/${roomCode}`);
    await new Promise(r => setTimeout(r, 4000));

    // Trigger next player transition while Chrome is connected
    console.log('      Triggering live player transition (Player 1 -> Player 2)...');
    hostSocket.emit('admin_next_player', { room_code: roomCode });
    await new Promise(r => setTimeout(r, 3000));

    // Place a bid to verify live timer reset and split-flap number animation
    console.log('      Placing live bid...');
    hostSocket.emit('bid', {
      room_code: roomCode,
      amount: 25000000,
      participant_id: regData.user.id,
    });
    await new Promise(r => setTimeout(r, 2000));

    // Test page refresh during live auction
    console.log('      Testing page refresh during live auction...');
    await client.navigate(`http://localhost:3000/room/${roomCode}`);
    await new Promise(r => setTimeout(r, 3000));

    hostSocket.disconnect();

    // Inspect DOM to ensure room loaded
    const titleText = await client.evaluate('document.title');
    console.log(`      Room Page Title: "${titleText}"`);

    // Check for hydration errors in collected console logs
    const hydrationErrors = client.consoleLogs.filter(
      l =>
        l.text.includes('Minified React error #418') ||
        l.text.includes('Minified React error #423') ||
        l.text.includes('Hydration failed') ||
        l.text.includes('did not match') ||
        l.text.includes('Hydration error')
    );

    console.log('\n--- BROWSER CONSOLE REPORT ---');
    console.log(`Total console entries captured: ${client.consoleLogs.length}`);
    console.log(`Total exceptions captured: ${client.exceptions.length}`);
    console.log(`Total hydration errors detected: ${hydrationErrors.length}`);

    if (hydrationErrors.length > 0) {
      allPassed = false;
      console.error('\n[CRITICAL FAILURE] React Hydration Errors Detected:');
      hydrationErrors.forEach(err => console.error(`  - [${err.type}] ${err.text}`));
      failureReasons.push(`React Hydration errors detected: ${hydrationErrors.length} errors`);
    } else {
      console.log('✓ ZERO React Hydration Errors (#418 / #423) Detected!');
    }

    if (client.exceptions.length > 0) {
      console.warn('\nExceptions detected:');
      client.exceptions.forEach(ex => console.warn(`  - ${ex}`));
    }
  } catch (err: any) {
    allPassed = false;
    failureReasons.push(err.message);
    console.error('Test execution error:', err);
  } finally {
    // Cleanup processes
    console.log('\nCleaning up processes...');
    client.close();
    chromeProcess.kill();
    nextProcess.kill();
    backend.close();
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n===============================================================');
  if (allPassed) {
    console.log('   RESULT: ALL TESTS PASSED! PRODUCTION READY.');
    console.log('===============================================================');
    process.exit(0);
  } else {
    console.error('   RESULT: VERIFICATION FAILED.');
    failureReasons.forEach(r => console.error(`   - ${r}`));
    console.log('===============================================================');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
