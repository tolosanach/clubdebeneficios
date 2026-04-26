"""Patch: x2 promo on front, mock logos, glass rim, navbar glass"""
import base64

SRC = 'app/page.js'
CSS = 'app/globals.css'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(lines, needle, start=0, end=None):
    r = range(start, end if end is not None else len(lines))
    for i in r:
        if needle in lines[i]:
            return i
    return -1

def svg_b64(svg):
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode()

# ── LOGOS ────────────────────────────────────────────────────────────────────
cafe_logo = svg_b64(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
    '<rect width="40" height="40" fill="#2A1508"/>'
    '<path d="M9 16h16l-2 10H11z" fill="#C47B35"/>'
    '<rect x="9" y="16" width="16" height="3" rx="1" fill="#D9934F"/>'
    '<path d="M25 18 Q31 19 31 24 Q31 29 25 29" stroke="#C47B35" stroke-width="2" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="17" cy="27" rx="9" ry="2" fill="#9A5C1F"/>'
    '<path d="M14 14 Q15 11 14 9" stroke="#C87941" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    '<path d="M18 14 Q19 11 18 9" stroke="#C87941" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    '<path d="M22 14 Q23 11 22 9" stroke="#C87941" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    '</svg>'
)
barber_logo = svg_b64(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
    '<rect width="40" height="40" fill="#111419"/>'
    '<circle cx="13" cy="12" r="4.5" stroke="#A0B0C8" stroke-width="1.5" fill="none"/>'
    '<circle cx="27" cy="12" r="4.5" stroke="#A0B0C8" stroke-width="1.5" fill="none"/>'
    '<circle cx="13" cy="12" r="1.8" fill="#A0B0C8"/>'
    '<circle cx="27" cy="12" r="1.8" fill="#A0B0C8"/>'
    '<line x1="17" y1="15" x2="29" y2="30" stroke="#A0B0C8" stroke-width="2" stroke-linecap="round"/>'
    '<line x1="23" y1="15" x2="11" y2="30" stroke="#A0B0C8" stroke-width="2" stroke-linecap="round"/>'
    '</svg>'
)
helado_logo = svg_b64(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
    '<rect width="40" height="40" fill="#0D1E2A"/>'
    '<path d="M20 35 L14 21 H26 Z" fill="#DBA06A"/>'
    '<line x1="20" y1="21" x2="20" y2="35" stroke="#C8894E" stroke-width="1.2"/>'
    '<line x1="17" y1="24" x2="23" y2="24" stroke="#C8894E" stroke-width="1"/>'
    '<line x1="17" y1="28" x2="23" y2="28" stroke="#C8894E" stroke-width="1"/>'
    '<ellipse cx="20" cy="21" rx="6" ry="6" fill="#5EC8C0"/>'
    '<ellipse cx="20" cy="15" rx="5" ry="5" fill="#FF9090"/>'
    '<circle cx="22" cy="12" r="3" fill="#FFB0B0"/>'
    '</svg>'
)

# ── PATCH 1a: promoBadge/promoSub/doublePromo in WalletCardFront ─────────────
wf_start = find_line(lines, "function WalletCardFront(")
assert wf_start != -1

pb_line = find_line(lines, "  const promoBadge = activePromo", wf_start, wf_start + 50)
assert pb_line != -1, "promoBadge not found"

# Confirm structure: 3 lines for promoBadge + 3 lines for promoSub = 6 total
assert 'discount_next' in lines[pb_line+1], f"Unexpected line {pb_line+2}: {lines[pb_line+1]!r}"
assert 'const promoSub' in lines[pb_line+3], f"Unexpected line {pb_line+4}: {lines[pb_line+3]!r}"
print(f"P1a promoBadge found at line {pb_line+1}")

new_promo_vars = [
    "  const promoBadge  = activePromo?.type === 'discount_next' ? `${activePromo.value}% OFF` : null\n",
    "  const promoSub    = activePromo?.type === 'discount_next' ? 'PRÓX. VISITA' : null\n",
    "  const doublePromo = (commerce?.promotions || []).find(p =>\n",
    "    p.active && p.type === 'double_points' && (!p.expires_at || new Date(p.expires_at) > now))\n",
]
lines[pb_line:pb_line+6] = new_promo_vars
print("P1a promoBadge/promoSub/doublePromo: OK")

# ── PATCH 1b: doublePromo JSX row after promoBadge block ─────────────────────
# Re-find WalletCardFront return after the variable patch (line numbers shifted)
wf_start2 = find_line(lines, "function WalletCardFront(")
ret_start  = find_line(lines, "  return (", wf_start2)

# Find the closing )} of the promoBadge block in JSX
# Pattern: {promoSub}</div> then next few lines has )}
promo_sub_jsx = find_line(lines, "{promoSub}</div>", ret_start, ret_start + 60)
assert promo_sub_jsx != -1, "promoSub JSX not found"

# Find the )} that closes the promoBadge conditional block
close_promo = find_line(lines, "            )}", promo_sub_jsx, promo_sub_jsx + 5)
if close_promo == -1:
    close_promo = find_line(lines, "          )}", promo_sub_jsx, promo_sub_jsx + 5)
assert close_promo != -1, "closing )} not found after promoSub"
print(f"P1b inserting doublePromo JSX after line {close_promo+1}")

double_jsx = (
    "            {doublePromo && (\n"
    "              <div style={{ marginTop:6, paddingTop:5, borderTop:`1px solid ${colors.detail}` }}>\n"
    "                <div style={{ fontFamily:FN, fontSize:13, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', lineHeight:1 }}>×2 {isStars ? 'ESTRELLAS' : 'PUNTOS'}</div>\n"
    "                <div style={{ fontFamily:FN, fontSize:7, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em', marginTop:2, textTransform:'uppercase' }}>{doublePromo.days || 'TODOS LOS DÍAS'}</div>\n"
    "              </div>\n"
    "            )}\n"
)
lines.insert(close_promo + 1, double_jsx)
print("P1b doublePromo JSX inserted")

# ── PATCH 2: Mock logos ───────────────────────────────────────────────────────
for needle, uri, label in [
    ("name:'Café Berlín', img_url:null",      cafe_logo,   "Café Berlín"),
    ("name:'Barbería Premium', img_url:null",  barber_logo, "Barbería Premium"),
    ("name:'Heladería Coppola', img_url:null", helado_logo, "Heladería Coppola"),
]:
    idx = find_line(lines, needle)
    if idx != -1:
        lines[idx] = lines[idx].replace("img_url:null", f"img_url:'{uri}'", 1)
        print(f"P2 {label} logo: line {idx+1}")
    else:
        print(f"P2 WARNING: {label} not found")

# ── PATCH 3: Glass rim on card-flip-scene ────────────────────────────────────
flip_scene = find_line(lines, 'className="card-flip-scene"')
assert flip_scene != -1, "card-flip-scene not found"
style_line = flip_scene + 1
old_shadow = "boxShadow:'0 20px 44px rgba(0,0,0,0.48), 0 4px 12px rgba(0,0,0,0.28)'"
new_shadow  = ("boxShadow:'0 20px 44px rgba(0,0,0,0.48), 0 4px 12px rgba(0,0,0,0.28), "
               "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.05), "
               "inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(255,255,255,0.08)'")
if old_shadow in lines[style_line]:
    lines[style_line] = lines[style_line].replace(old_shadow, new_shadow)
    print(f"P3 glass rim on card: line {style_line+1}")
else:
    print(f"P3 WARNING: shadow not found on line {style_line+1}: {lines[style_line]!r}")

# ── PATCH 4: Nav button glass ─────────────────────────────────────────────────
old_btn = "background:'rgba(255,255,255,0.08)', border:`1px solid ${C.rim}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'"
new_btn  = ("background:'rgba(255,255,255,0.07)', border:`1px solid rgba(255,255,255,0.16)`, "
            "boxShadow:'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)', "
            "display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'")
count = 0
for i, line in enumerate(lines):
    if old_btn in line:
        lines[i] = line.replace(old_btn, new_btn)
        count += 1
print(f"P4 nav button glass: {count} buttons updated")

# ── WRITE page.js ─────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"page.js written: {len(lines)} lines")

# ── PATCH 5: navbar-glass CSS ─────────────────────────────────────────────────
with open(CSS, 'r', encoding='utf-8') as f:
    css = f.read()

old_navbar = """.navbar-glass {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}"""

new_navbar = """.navbar-glass {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
  position: relative;
  overflow: hidden;
}
.navbar-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.00) 65%
  );
  pointer-events: none;
}"""

if old_navbar in css:
    css = css.replace(old_navbar, new_navbar)
    print("P5 navbar-glass CSS: OK")
else:
    print("P5 WARNING: navbar-glass not found in CSS")

with open(CSS, 'w', encoding='utf-8') as f:
    f.write(css)
print("globals.css written")
