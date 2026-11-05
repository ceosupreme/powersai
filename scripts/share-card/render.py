"""Make a 1200 x 630 link-preview card for a client proposal.

python3 scripts/share-card/render.py <slug> "<eyebrow>" "<headline>" "<subline>" [background.jpg] [--no-play]
Writes public/og/proposal-<slug>.jpg. Then add the slug to src/config/proposalShare.js.
Pass --no-play for a proposal that has no video yet, so the card shows no Watch button.
"""
import html, pathlib, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

here = pathlib.Path(__file__).resolve().parent
no_play = "--no-play" in sys.argv
args = [a for a in sys.argv[1:] if a != "--no-play"]
slug, eyebrow, headline, sub = args[0:4]
bg = pathlib.Path(args[4]).resolve().as_uri() if len(args) > 4 else "seminar2.jpg"
page = (here / "card.html").read_text()
for k, v in {"EYEBROW": eyebrow, "HEADLINE": headline, "SUB": sub}.items():
    page = page.replace("{{%s}}" % k, html.escape(v))
page = page.replace("{{BG}}", bg)
if no_play:
    page = re.sub(r'<div class="play"></div><div class="lbl">Watch</div>', "", page)
    page = page.replace("max-width:820px", "max-width:1000px")
tmp = here / "_card.html"
tmp.write_text(page)
png = here / "_card.png"
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto(tmp.as_uri())
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(png))
    b.close()
out = here.parent.parent / "public" / "og" / f"proposal-{slug}.jpg"
Image.open(png).convert("RGB").save(out, quality=86, optimize=True)
tmp.unlink()
png.unlink()
print(out)
