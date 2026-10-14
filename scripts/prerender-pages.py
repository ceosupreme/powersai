import asyncio,html,json,os,re,sys,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
root,manifest=Path(sys.argv[1]),Path(sys.argv[2]);routes=list(dict.fromkeys(json.loads(manifest.read_text())))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=root,**k)
 def log_message(self,*_):pass
 def do_GET(self):
  # A folder is answered with its index.html in place (no redirect to a trailing slash), so each page
  # is drawn at the same address visitors use.
  address,_,query=self.path.partition("?");target=root/address.lstrip("/")
  if target.is_dir():self.path=address.rstrip("/")+"/index.html"+(f"?{query}" if query else "");target=target/"index.html"
  if not target.exists():self.path="/index.html"
  return super().do_GET()
class Server(ThreadingHTTPServer):
 # Pages are closed as soon as their copy is taken, which cuts off files still loading; that's expected.
 def handle_error(self,request,address):
  if not isinstance(sys.exc_info()[1],(BrokenPipeError,ConnectionResetError)):super().handle_error(request,address)
server=Server(("127.0.0.1",0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
# A page counts as ready once it has a <main> and no "Loading…" status is left on it.
LOADED="!Array.from(document.querySelectorAll('#root [role=status]')).some(e=>/^\\s*Loading/.test(e.textContent||''))"
# Some sections load a second set of rows after the first paint, so wait until the page text stops changing (1.2 s still, 8 s at most).
SETTLED="async()=>{const r=document.getElementById('root');let last=-1,still=0;for(let i=0;i<40;i++){const n=(r.textContent||'').length;if(n===last){still+=200;if(still>=1200)return true}else{still=0;last=n}await new Promise(f=>setTimeout(f,200))}return false}"
# First copy of the page, the way React itself wrote it:
#  - classes, data-* attributes and --custom properties come from what React set, not what page code
#    added afterwards (lit, on, data-armed...);
#  - a <!-- --> marker sits between neighboring text pieces (the browser would otherwise merge them);
#  - drawings made in code (data-drawn) are left empty; the browser draws them again on load.
MARKUP="""()=>{const src=document.getElementById('root');const c=src.cloneNode(true);const a=src.querySelectorAll('*'),b=c.querySelectorAll('*');for(let i=0;i<a.length;i++){const el=a[i],cl=b[i];const k=Object.keys(el).find(x=>x.startsWith('__reactProps$'));if(!k)continue;const p=el[k]||{};if(typeof p.className==='string'){if(p.className)cl.setAttribute('class',p.className);else cl.removeAttribute('class')}else cl.removeAttribute('class');for(const at of [...cl.attributes])if(at.name.startsWith('data-')&&!(at.name in p))cl.removeAttribute(at.name);const st=p.style||{};for(const pr of [...cl.style])if(pr.startsWith('--')&&!(pr in st))cl.style.removeProperty(pr);if(cl.getAttribute('style')==='')cl.removeAttribute('style')}const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);const t=[];for(let n=w.nextNode();n;n=w.nextNode())t.push(n);for(const n of t){if(n.nextSibling&&n.nextSibling.nodeType===3)n.parentNode.insertBefore(document.createComment(' '),n.nextSibling)}c.querySelectorAll('[data-drawn]').forEach(e=>{e.innerHTML=''});return c.innerHTML}"""
# The data each page was drawn with, saved next to it so the browser's first draw matches the saved page ('<' escaped so it can't close the tag).
STATE="()=>window.__STM_DEHYDRATE__?JSON.stringify(window.__STM_DEHYDRATE__()).replace(/</g,'\\\\u003c'):''"
# Second pass: open the saved copy the way a visitor's browser does and keep the page as React's first
# draw over it saw it (prerender-first-draw.js). A page that fails this check stays a plain picture that
# the browser redraws from scratch, the way every page loaded before.
FIRST_DRAW=Path(__file__).with_name("prerender-first-draw.js").read_text()
# Uploaded images live on the hosting CDN, which this local server doesn't have. Answer them with a
# blank pixel so pages keep their <img> tags instead of switching to a missing-image fallback.
PIXEL=bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082")
async def CDN_IMAGE(route):await route.fulfill(status=200,content_type="image/png",body=PIXEL)
# Page views from the publish step are not visitors; keep them out of the site's visit counts.
async def NO_VISIT(route):await route.fulfill(status=201,headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*"},body="")
async def render():
 from playwright.async_api import async_playwright
 async with async_playwright() as api:
  browser=await api.chromium.launch(headless=True);gate=asyncio.Semaphore(6)
  async def open_page():
   page=await browser.new_page(viewport={"width":1280,"height":1800})
   await page.route("**/__l5e/assets-v1/**",CDN_IMAGE);await page.route(re.compile(r"/rest/v1/site_events"),NO_VISIT)
   return page
  def write(out,text):
   # Written to a side file and swapped in, so a stopped build never leaves half a page behind.
   part=out.with_name(out.name+".part");part.write_text(text);os.replace(part,out)
  async def one(route):
   async with gate:
    url=f"http://127.0.0.1:{server.server_port}{route}";out=root/("index.html" if route=="/" else route.lstrip("/")+"/index.html")
    try:template=out.read_text();start=template.index('<div id="root">');end=template.index('</div>',start)
    except Exception as error:print(f"[prerender] skipped {route}: {error}");return
    def page_html(body,state,hydrate):
     marks=f' data-saved-path="{html.escape(route,quote=True)}"'+(' data-hydrate=""' if hydrate else '')
     return template[:start]+f'<div id="root"{marks}>{body}</div>'+(f'<script id="stm-query-state" type="application/json">{state}</script>' if state else '')+template[end+6:]
    # A slow moment during the publish step (a busy first batch, a slow data reply) gets one more try
    # before the page is left as a plain fallback.
    for attempt in (1,2):
     page=await open_page()
     try:
      await page.goto(url,wait_until="networkidle",timeout=30000);await page.wait_for_selector("#root main",timeout=15000);await page.wait_for_function(LOADED,timeout=15000);await page.evaluate(SETTLED);body=await page.evaluate(MARKUP);state=await page.evaluate(STATE);write(out,page_html(body,state,False));break
     except Exception as error:
      if attempt==2:print(f"[prerender] skipped {route}: {error}");return
      print(f"[prerender] retrying {route}: {str(error).splitlines()[0][:120]}");await asyncio.sleep(3)
     finally:await page.close()
    page=await open_page()
    try:
     # The trial copy is served from memory; the file on disk only changes once the check passes.
     trial=page_html(body,state,True)
     async def serve_trial(request):await request.fulfill(status=200,content_type="text/html; charset=utf-8",body=trial)
     await page.route(lambda address:address==url,serve_trial);await page.add_init_script(FIRST_DRAW);await page.goto(url,wait_until="commit",timeout=30000);await page.wait_for_function("window.__STM_FIRST_DRAW__!==undefined",timeout=20000);first=await page.evaluate("window.__STM_FIRST_DRAW__")
     if first.get("ok"):write(out,page_html(first["html"],state,True));print(f"[prerender] rendered {route}")
     else:print(f"[prerender] rendered {route} (redrawn on load: {first.get('why')})")
    except Exception as error:print(f"[prerender] rendered {route} (redrawn on load: {error})")
    finally:await page.close()
  # The homepage goes first on its own (its file is also the fallback), then six routes at a time.
  for route in [r for r in routes if r=="/"]:await one(route)
  for result in await asyncio.gather(*(one(route) for route in routes if route!="/"),return_exceptions=True):
   if isinstance(result,BaseException):print(f"[prerender] a page failed: {result}")
  await browser.close()
try:asyncio.run(render())
finally:server.shutdown()
