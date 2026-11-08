#!/usr/bin/env python3
"""Build the investor area into /investor/ of the site (index.html + vendor + fonts + assets). Same libraries and fonts as the customer portal."""
import json, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).parent
SITE = ROOT.parents[2]
PORTAL = SITE / "_src" / "belinus-portal" / "app"
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else SITE / "investor"
CFG = {"url": "https://cbykdhbqfgjzodldavvy.supabase.co", "key": "sb_publishable_IBxDom__KOP-VQatBR6PsQ_cy8s-CXd"}
for d in ["vendor", "fonts", "assets"]: (OUT / d).mkdir(parents=True, exist_ok=True)
for f in (PORTAL / "vendor").iterdir(): shutil.copy(f, OUT / "vendor" / f.name)
for f in ["ArialNova-Light.woff2", "ArialNova.woff2", "ArialNova-Bold.woff2"]: shutil.copy(SITE / "fonts" / f, OUT / "fonts" / f)
for f in (ROOT / "fonts").glob("*.woff2"): shutil.copy(f, OUT / "fonts" / f.name)
for f in ["logo-belinus.png", "logo-belinus-white.png", "favicon-32.png", "favicon-180.png"]: shutil.copy(SITE / "portal" / "assets" / f, OUT / "assets" / f)
shutil.copy(SITE / "assets" / "press" / "belinus-logo-blue.png", OUT / "assets" / "logo-belinus-blue.png")
for f in (ROOT / "assets").glob("*") if (ROOT / "assets").exists() else []: shutil.copy(f, OUT / "assets" / f.name)
src = (ROOT / "src" / "I18n.jsx").read_text() + "\n" + (ROOT / "src" / "Investor.jsx").read_text() + "\n" + (ROOT / "src" / "Admin.jsx").read_text() + "\n" + (ROOT / "src" / "App.jsx").read_text()
tmp = ROOT / "_inv.jsx"; tmp.write_text(src)
js = subprocess.run(["npx", "-y", "esbuild@0.24.0", str(tmp), "--loader:.jsx=jsx", "--jsx=transform", "--minify", "--target=es2019"], check=True, capture_output=True, text=True).stdout
tmp.unlink()
css = (ROOT / "src" / "investor.css").read_text()
(OUT / "index.html").write_text(f"""<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Investeerdersportaal EVChargeking</title><meta name="robots" content="noindex"><meta name="theme-color" content="#000000">
<link rel="icon" href="assets/favicon-32.png"><script>try{{if(localStorage.getItem("belinus_theme")==="light")document.documentElement.dataset.theme="light"}}catch(e){{}}</script><style>{css}</style></head>
<body><div id="root"></div><noscript>Schakel JavaScript in om het investeerdersportaal te gebruiken.</noscript>
<script>window.BELINUS_INV = {json.dumps(CFG)};</script>
<script src="vendor/react-18.3.1.min.js"></script><script src="vendor/react-dom-18.3.1.min.js"></script><script src="vendor/supabase-2.78.0.js"></script>
<script>{js}</script></body></html>
""")
print("built", OUT / "index.html")
