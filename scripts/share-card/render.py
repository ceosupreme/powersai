"""Make a 1200 x 630 link-preview card for a client proposal.

python3 scripts/share-card/render.py <slug> "<eyebrow>" "<headline>" "<subline>" [background.jpg]
Writes public/og/proposal-<slug>.jpg. Then add the slug to src/config/proposalShare.js.
"""
import html, pathlib, sys
from playwright.sync_api import sync_playwright
from PIL import Image

here = pathlib.Path(__file__).resolve().parent
slug, eyebrow, headline, sub = sys.argv[1:5]
bg = pathlib.Path(sys.argv[5]).resolve().as_uri() if len(sys.argv) > 5 else "seminar2.jpg"
page = (here / "card.html").read_text()
for k, v in {"EYEBROW": eyebrow, "HEADLINE": headline, "SUB": sub}.items():
    page = page.replace("{{%s}}" % k, html.escape(v))
page = page.replace("{{BG}}", bg)
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
