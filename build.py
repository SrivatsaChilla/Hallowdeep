# Bundles src/ into one self-contained file: dist/hollowdeep.html
from pathlib import Path
root = Path(__file__).parent
order = ["core", "cards", "potions", "monsters", "relics", "versions", "combat", "run", "events", "act2", "act3", "colorless", "enchants", "events2", "ancients", "silent", "regent_data", "regent", "orbs", "defect_data", "defect", "osty", "necro_data", "necro", "neow2", "ascension_data", "ascension", "names", "naming", "art", "sigils", "ui"]
js = "\n".join((root / "src" / f"{n}.js").read_text() for n in order)
css = (root / "src" / "style.css").read_text()
html = (root / "src" / "index.html").read_text().replace("/*CSS*/", css).replace("/*JS*/", js)
out = root / "dist" / "hallowdeep.html"
out.parent.mkdir(parents=True, exist_ok=True)  # dist/ is not in the repo
out.write_text(html)
(out.parent / 'index.html').write_text(html)  # Netlify serves dist/ with this as the home page
print(f"wrote {out} ({len(html)//1024} KB)")
