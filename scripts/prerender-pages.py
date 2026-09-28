import asyncio,json,sys,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
root,manifest=Path(sys.argv[1]),Path(sys.argv[2]);routes=json.loads(manifest.read_text())
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=root,**k)
 def log_message(self,*_):pass
 def do_GET(self):
  target=root/self.path.split("?",1)[0].lstrip("/");target=target/"index.html" if target.is_dir() else target
  if not target.exists():self.path="/index.html"
  return super().do_GET()
server=ThreadingHTTPServer(("127.0.0.1",0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
async def render():
 from playwright.async_api import async_playwright
 async with async_playwright() as api:
  browser=await api.chromium.launch(headless=True);page=await browser.new_page(viewport={"width":1280,"height":1800})
  for route in routes:
   try:
    await page.goto(f"http://127.0.0.1:{server.server_port}{route}",wait_until="networkidle",timeout=30000);await page.wait_for_selector("#root main",timeout=15000);body=await page.locator("#root").inner_html();out=root/("index.html" if route=="/" else route.lstrip("/")+"/index.html");html=out.read_text();start=html.index('<div id="root">');end=html.index('</div>',start);out.write_text(html[:start]+f'<div id="root">{body}</div>'+html[end+6:]);print(f"[prerender] rendered {route}")
   except Exception as error:print(f"[prerender] skipped {route}: {error}")
  await browser.close()
try:asyncio.run(render())
finally:server.shutdown()