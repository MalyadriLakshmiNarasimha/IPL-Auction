import urllib.request, json, os, subprocess, time, asyncio, base64

async def main():
    out_dir = os.path.join(os.getcwd(), 'verification_screenshots')
    os.makedirs(out_dir, exist_ok=True)

    profile_dir = os.path.join(os.environ.get('TEMP', '/tmp'), f'chrome-view-{int(time.time())}')
    chrome = subprocess.Popen([
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        '--remote-debugging-port=9228',
        '--no-sandbox',
        '--disable-gpu',
        f'--user-data-dir={profile_dir}',
        'about:blank'
    ])
    await asyncio.sleep(2)

    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9228/json').read())
        ws_url = tabs[0]['webSocketDebuggerUrl']
        import websockets

        async with websockets.connect(ws_url, max_size=None) as ws:
            id_counter = 1
            async def send(method, params={}):
                nonlocal id_counter
                cid = id_counter
                id_counter += 1
                await ws.send(json.dumps({'id': cid, 'method': method, 'params': params}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get('id') == cid:
                        return msg.get('result')

            viewports = [
                {'name': '1920x1080', 'w': 1920, 'h': 1080},
                {'name': '1536x730', 'w': 1536, 'h': 730},
                {'name': '1366x768', 'w': 1366, 'h': 768},
                {'name': '1024x768', 'w': 1024, 'h': 768},
                {'name': '390x844', 'w': 390, 'h': 844, 'mobile': True},
            ]

            results = []

            for vp in viewports:
                await send('Emulation.setDeviceMetricsOverride', {
                    'width': vp['w'],
                    'height': vp['h'],
                    'deviceScaleFactor': 1,
                    'mobile': vp.get('mobile', False)
                })

                # Clear storage
                await send('Network.clearBrowserCookies')
                await send('Page.navigate', {'url': 'http://localhost:3000/'})
                await asyncio.sleep(2.5)

                # Capture screenshot
                shot = await send('Page.captureScreenshot', {'format': 'png'})
                shot_path = os.path.join(out_dir, f"hero_{vp['name']}.png")
                with open(shot_path, 'wb') as f:
                    f.write(base64.b64decode(shot['data']))

                # Measure dimensions and positions
                eval_res = await send('Runtime.evaluate', {
                    'expression': """(() => {
                        const nav = document.querySelector('header');
                        const heroContainer = document.querySelector('section > div');
                        const h2 = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('CHOOSE YOUR ARENA'));
                        const arenaSection = document.querySelector('#arenas');
                        const authBtns = Array.from(document.querySelectorAll('header a')).map(a => a.textContent.trim());

                        const navRect = nav ? nav.getBoundingClientRect() : null;
                        const heroRect = heroContainer ? heroContainer.getBoundingClientRect() : null;
                        const h2Rect = h2 ? h2.getBoundingClientRect() : null;
                        const arenaRect = arenaSection ? arenaSection.getBoundingClientRect() : null;

                        return {
                            navHeight: navRect ? navRect.height : 0,
                            heroHeight: heroRect ? heroRect.height : 0,
                            heroTop: heroRect ? heroRect.top : 0,
                            heroBottom: heroRect ? heroRect.bottom : 0,
                            viewportHeight: window.innerHeight,
                            chooseYourArenaTop: h2Rect ? h2Rect.top : 0,
                            arenaSectionTop: arenaRect ? arenaRect.top : 0,
                            isChooseYourArenaBelowFold: h2Rect ? h2Rect.top >= window.innerHeight : true,
                            authButtonsFound: authBtns.filter(t => t.includes('Log In') || t.includes('Register')),
                            hasPulsePill: Boolean(document.querySelector('header .animate-pulse'))
                        };
                    })()""",
                    'returnByValue': True
                })

                info = eval_res.get('value', {})
                results.append({'vp': vp['name'], **info})
                print(f"[{vp['name']}] Hero Height: {info.get('heroHeight')}px | Viewport: {vp['h']}px | Choose Your Arena Top: {info.get('chooseYourArenaTop')}px (Below fold: {info.get('isChooseYourArenaBelowFold')}) | Auth: {info.get('authButtonsFound')} | Pulse Pill: {info.get('hasPulsePill')}")

            # Light theme test on 1440x900
            await send('Emulation.setDeviceMetricsOverride', {
                'width': 1440,
                'height': 900,
                'deviceScaleFactor': 1,
                'mobile': False
            })
            # Toggle light theme
            await send('Runtime.evaluate', {
                'expression': """(() => {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                })()"""
            })
            await asyncio.sleep(0.5)
            shot_light = await send('Page.captureScreenshot', {'format': 'png'})
            with open(os.path.join(out_dir, "hero_light_theme_1440.png"), 'wb') as f:
                f.write(base64.b64decode(shot_light['data']))
            print("[Light Theme] Saved hero_light_theme_1440.png")

    finally:
        chrome.kill()

asyncio.run(main())
