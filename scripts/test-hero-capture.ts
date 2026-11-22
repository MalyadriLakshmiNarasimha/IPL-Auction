import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

class CDPClient {
  private ws: any = null;
  private msgId = 1;
  private pending = new Map();

  constructor(private wsUrl: string) {}

  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err: any) => reject(err);
      this.ws.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data.toString());
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch (e) {}
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  }

  async screenshot(filePath: string, clip?: any) {
    const params: any = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

async function run() {
  const profileDir = path.join(os.tmpdir(), 'chrome-diag-' + Date.now());
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=' + profileDir,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const tabsRes = await fetch('http://localhost:9229/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find((t: any) => t.type === 'page') || tabs[0];
  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  // Set desktop viewport
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await client.send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2000));

  // Check scroll position and active element
  const diag = await client.evaluate(`({
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    activeElement: document.activeElement ? document.activeElement.tagName + '.' + document.activeElement.className : null,
    hash: window.location.hash
  })`);
  console.log('Page Diagnostics on load:', diag);

  // Force scroll to top
  await client.evaluate(`window.scrollTo(0, 0);`);
  await new Promise(r => setTimeout(r, 500));

  await client.screenshot('public/images/desktop-hero-verified.png', {
    x: 0,
    y: 0,
    width: 1440,
    height: 860,
    scale: 1
  });
  console.log('Saved public/images/desktop-hero-verified.png');

  // Mobile
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await client.evaluate(`window.scrollTo(0, 0);`);
  await new Promise(r => setTimeout(r, 500));

  await client.screenshot('public/images/mobile-hero-verified.png', {
    x: 0,
    y: 0,
    width: 390,
    height: 844,
    scale: 1
  });
  console.log('Saved public/images/mobile-hero-verified.png');

  client.close();
  chrome.kill();
}

run().catch(console.error);
