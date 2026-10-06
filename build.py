# Bundles src/ into one self-contained file: dist/hollowdeep.html
import hashlib
from pathlib import Path
root = Path(__file__).parent
order = ["core", "cards", "potions", "monsters", "relics", "versions", "combat", "run", "events", "act2", "act3", "colorless", "enchants", "events2", "ancients", "silent", "regent_data", "regent", "orbs", "defect_data", "defect", "osty", "necro_data", "necro", "coop", "neow2", "ascension_data", "ascension", "net", "rtc", "names", "naming", "art", "sigils", "ui", "coopui"]
js = "\n".join((root / "src" / f"{n}.js").read_text() for n in order)
# A fingerprint of this build: multiplayer only lets players with the same build play together.
js += f"\nHD.BUILD = '{hashlib.sha1(js.encode()).hexdigest()[:12]}';\n"
css = (root / "src" / "style.css").read_text()
html = (root / "src" / "index.html").read_text().replace("/*CSS*/", css).replace("/*JS*/", js)
out = root / "dist" / "hallowdeep.html"
out.parent.mkdir(parents=True, exist_ok=True)  # dist/ is not in the repo
out.write_text(html)
(out.parent / 'index.html').write_text(html)  # Netlify serves dist/ with this as the home page
print(f"wrote {out} ({len(html)//1024} KB)")
