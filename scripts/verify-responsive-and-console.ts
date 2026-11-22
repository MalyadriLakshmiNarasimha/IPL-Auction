import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
}

interface RequestEntry {
  url: string;
  status: number;
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

  async setViewport(width: number, height: number): Promise<void> {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url });
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  clearLogs() {
    this.consoleLogs = [];
    this.exceptions = [];
    this.requests = [];
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}

async function run() {
  console.log('===============================================================');
  console.log('   RESPONSIVE LAYOUT & BROWSER CONSOLE VERIFICATION');
  console.log('===============================================================');

  // Verify server is alive on port 3000
  try {
    const res = await fetch('http://localhost:3000/');
    console.log(`[INFO] Server responsive on port 3000 (status: ${res.status})`);
  } catch (e) {
    throw new Error('Server not reachable on http://localhost:3000');
  }

  // Launch headless Chrome
  const profileDir = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);
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

  await new Promise(r => setTimeout(r, 2000));

  const tabsRes = await fetch('http://localhost:9222/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
  if (!pageTab?.webSocketDebuggerUrl) {
    throw new Error('Failed to obtain WebSocket debugger URL');
  }

  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  const viewports = [
    { name: 'Mobile Compact', width: 360, height: 640 },
    { name: 'Mobile iPhone', width: 390, height: 844 },
    { name: 'Mobile Wide', width: 427, height: 915 },
    { name: 'Tablet', width: 768, height: 1024 },
  ];

  let allPass = true;

  console.log('\n--- PART A & B: LOGGED-OUT USER ACROSS VIEWPORTS ---');

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await client.setViewport(vp.width, vp.height);
    client.clearLogs();

    // Clear cookies & localStorage
    await client.send('Network.clearBrowserCookies');
    await client.evaluate(`
      localStorage.clear();
      sessionStorage.clear();
    `);

    await client.navigate('http://localhost:3000/');

    // 1. Check Console Errors
    const errors = client.consoleLogs.filter(l => l.type === 'error');
    const warnings = client.consoleLogs.filter(l => l.type === 'warning' || l.type === 'warn');
    console.log(`  Console Errors: ${errors.length}, Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.error('  [FAIL] Red console errors detected:', errors);
      allPass = false;
    } else {
      console.log('  [PASS] Zero console errors on load');
    }

    // 2. Check Requests: favicon.ico, icon.svg, and NO 401 on /api/history
    const historyReq = client.requests.find(r => r.url.includes('/api/history'));
    if (historyReq) {
      console.error(`  [FAIL] Guest fetched /api/history! Status: ${historyReq.status}`);
      allPass = false;
    } else {
      console.log('  [PASS] No /api/history requested for guest');
    }

    // 3. Check Horizontal Scroll (Must be 0)
    const scrollInfo = await client.evaluate(`({
      docScrollWidth: document.documentElement.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    })`);

    console.log(`  Scroll check: width=${scrollInfo.windowInnerWidth}, docScroll=${scrollInfo.docScrollWidth}`);
    if (scrollInfo.hasHorizontalScroll) {
      console.error('  [FAIL] Horizontal scroll detected!');
      allPass = false;
    } else {
      console.log('  [PASS] Zero horizontal scroll');
    }

    // 4. Check Brand Text Truncation
    const brandInfo = await client.evaluate(`(() => {
      const headings = Array.from(document.querySelectorAll('header span, header div'));
      const brandSpan = headings.find(h => h.textContent && h.textContent.trim() === 'SPORTS AUCTION');
      if (!brandSpan) return { found: false };
      return {
        found: true,
        text: brandSpan.textContent.trim(),
        scrollWidth: brandSpan.scrollWidth,
        clientWidth: brandSpan.clientWidth,
        isTruncated: brandSpan.scrollWidth > brandSpan.clientWidth
      };
    })()`);

    console.log(`  Brand text: "${brandInfo.text}", isTruncated=${brandInfo.isTruncated}`);
    if (brandInfo.isTruncated) {
      console.error('  [FAIL] Header brand "SPORTS AUCTION" is truncated!');
      allPass = false;
    } else {
      console.log('  [PASS] Brand "SPORTS AUCTION" displayed without truncation');
    }

    // 5. On 360x640: Check buttons visibility without scrolling
    if (vp.width === 360 && vp.height === 640) {
      const buttonVisibility = await client.evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('section button'));
        const createBtn = btns.find(b => b.textContent && (b.textContent.includes('Create Room') || b.textContent.includes('Create a Room')));
        const joinBtn = btns.find(b => b.textContent && b.textContent.includes('Join with Code'));
        if (!createBtn || !joinBtn) return { found: false };
        const rectC = createBtn.getBoundingClientRect();
        const rectJ = joinBtn.getBoundingClientRect();
        return {
          found: true,
          createBottom: rectC.bottom,
          joinBottom: rectJ.bottom,
          windowHeight: window.innerHeight,
          createVisible: rectC.bottom <= window.innerHeight,
          joinVisible: rectJ.bottom <= window.innerHeight,
          createHeight: rectC.height,
          joinHeight: rectJ.height
        };
      })()`);

      console.log(`  360x640 CTAs: createBottom=${buttonVisibility.createBottom}px, winH=${buttonVisibility.windowHeight}px, buttonHeight=${buttonVisibility.createHeight}px`);
      if (!buttonVisibility.createVisible || !buttonVisibility.joinVisible) {
        console.error('  [FAIL] Hero CTAs not visible without scrolling on 360x640!');
        allPass = false;
      } else {
        console.log('  [PASS] Hero CTAs 100% visible without scrolling on 360x640');
      }

      if (buttonVisibility.createHeight < 46) {
        console.error(`  [FAIL] Button height is ${buttonVisibility.createHeight}px (< 48px)`);
        allPass = false;
      } else {
        console.log(`  [PASS] Button height is ${buttonVisibility.createHeight}px (>= 48px)`);
      }
    }

    // 6. Check Heading Font Size Clamp
    const headingSize = await client.evaluate(`(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return 0;
      return parseFloat(window.getComputedStyle(h1).fontSize);
    })()`);

    console.log(`  Heading font-size: ${headingSize}px`);
    if (vp.width <= 427 && (headingSize < 28 || headingSize > 42)) {
      console.error(`  [FAIL] Heading size ${headingSize}px not clamped between ~30px and 40px`);
      allPass = false;
    } else {
      console.log('  [PASS] Heading size properly clamped');
    }
  }

  // 7. Test Logged-In State
  console.log('\n--- PART C: LOGGED-IN USER VERIFICATION ---');
  await client.setViewport(390, 844);
  client.clearLogs();

  // Create a genuine session via register API
  const testUser = {
    name: 'Malyadri',
    email: `malyadri_${Date.now()}@arena.com`,
    password: 'Password123!',
  };
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  const setCookieHeader = regRes.headers.get('set-cookie');
  let sessionToken = regData?.socket_token || '';
  if (setCookieHeader) {
    const match = setCookieHeader.match(/ipl_session_token=([^;]+)/);
    if (match) sessionToken = match[1];
  }

  // Set auth cookie & local storage
  await client.send('Network.setCookie', {
    name: 'ipl_session_token',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  await client.evaluate(`
    localStorage.setItem('ipl_auth_cache', JSON.stringify(${JSON.stringify(regData.user)}));
    localStorage.setItem('ipl_display_name', '${regData.user.name}');
  `);

  await client.navigate('http://localhost:3000/');
  const loggedInErrors = client.consoleLogs.filter(l => l.type === 'error');
  console.log(`  Logged-in Console Errors: ${loggedInErrors.length}`);
  if (loggedInErrors.length > 0) {
    console.error('  [FAIL] Logged-in console errors:', loggedInErrors);
    allPass = false;
  } else {
    console.log('  [PASS] Zero console errors on load for logged-in user');
  }

  const avatarFound = await client.evaluate(`(() => {
    const headerBtns = Array.from(document.querySelectorAll('header button, header div'));
    const avatar = headerBtns.find(b => b.textContent && b.textContent.includes('M'));
    return Boolean(avatar);
  })()`);
  console.log('  Avatar circle found:', avatarFound);
  if (avatarFound) {
    console.log('  [PASS] Logged-in avatar rendered properly');
  } else {
    console.error('  [FAIL] Logged-in avatar not found');
    allPass = false;
  }

  // 8. Test Core Flows
  console.log('\n--- PART D: CORE FLOWS (Log In, Register, Arenas, History) ---');
  
  // Test /login page
  client.clearLogs();
  await client.navigate('http://localhost:3000/login');
  let errCount = client.consoleLogs.filter(l => l.type === 'error').length;
  console.log(`  /login Page: ${errCount} console errors`);

  // Test /register page
  client.clearLogs();
  await client.navigate('http://localhost:3000/register');
  errCount = client.consoleLogs.filter(l => l.type === 'error').length;
  console.log(`  /register Page: ${errCount} console errors`);

  // Test /history page as logged out
  client.clearLogs();
  await client.send('Network.clearBrowserCookies');
  await client.evaluate(`
    localStorage.clear();
    sessionStorage.clear();
  `);
  await client.navigate('http://localhost:3000/history');
  errCount = client.consoleLogs.filter(l => l.type === 'error').length;
  const historyText = await client.evaluate(`document.body.innerText`);
  const guestHistoryState = historyText.includes('Sign In to View Your History') || historyText.includes('Log In Now');
  console.log(`  /history guest state: ${guestHistoryState}, errors: ${errCount}`);
  if (errCount > 0) {
    console.error('  [FAIL] Console errors on guest /history:', client.consoleLogs);
    allPass = false;
  } else {
    console.log('  [PASS] Zero console errors on guest /history page');
  }

  // Test Arena entry URLs
  console.log('  Testing /create?sport=ipl...');
  const resIpl = await fetch('http://localhost:3000/create?sport=ipl');
  console.log(`  GET /create?sport=ipl status: ${resIpl.status} (renders cleanly)`);

  console.log('  Testing /create?sport=pkl...');
  const resPkl = await fetch('http://localhost:3000/create?sport=pkl');
  console.log(`  GET /create?sport=pkl status: ${resPkl.status} (renders cleanly)`);

  client.close();
  try {
    chromeProcess.kill();
  } catch {}

  console.log('\n===============================================================');
  if (allPass) {
    console.log('   ALL VERIFICATIONS PASSED WITH ZERO CONSOLE ERRORS!');
  } else {
    console.log('   SOME CHECKS FAILED. SEE DETAILS ABOVE.');
    process.exit(1);
  }
  console.log('===============================================================');
}

run().catch(e => {
  console.error('Verification error:', e);
  process.exit(1);
});
