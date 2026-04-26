"""
Three features:
  1. Counting animation on WalletCardFront (visible prop trigger)
  2. WalletCardBack: QR overlay + fix 'ir al club' link stopPropagation
  3. Prop chain: userId through WalletView -> WalletCard -> WalletCardBack
"""
import sys

SRC = 'app/page.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(lines, needle, start=0, end=None):
    r = range(start, end or len(lines))
    for i in r:
        if needle in lines[i]:
            return i
    return -1

# ─── PATCH 1: WalletCardFront — counting animation ────────────────────────────
# a) Add `visible` to signature
p1_sig = find_line(lines, "function WalletCardFront({")
assert p1_sig != -1
lines[p1_sig] = lines[p1_sig].replace(
    "function WalletCardFront({ club, colors, onFlip })",
    "function WalletCardFront({ club, colors, onFlip, visible })"
)
print(f"P1a signature: line {p1_sig+1}")

# b) Insert animation state + effect after the promoSub block
#    Find: '  const promoSub = activePromo' then find the next blank line after the closing ')'
promo_sub_line = find_line(lines, "  const promoSub = activePromo", p1_sig)
# Find the blank line after the promoSub block (closes with ': null')
insert_after = find_line(lines, ": null", promo_sub_line) + 1
assert insert_after > promo_sub_line
print(f"P1b insert animation after line {insert_after}")

ANIM_BLOCK = (
    "\n"
    "  // Counting animation — runs each time front becomes visible\n"
    "  const [displayBal,      setDisplayBal]      = useState(0)\n"
    "  const [displayPromoVal, setDisplayPromoVal] = useState(0)\n"
    "  const promoVal = activePromo?.type === 'discount_next' ? (activePromo.value || 0) : 0\n"
    "\n"
    "  useEffect(() => {\n"
    "    if (!visible) { setDisplayBal(0); setDisplayPromoVal(0); return }\n"
    "    const duration = 650\n"
    "    const t0 = performance.now()\n"
    "    const ease = t => 1 - Math.pow(1 - t, 3)\n"
    "    let raf\n"
    "    const tick = now => {\n"
    "      const p = Math.min((now - t0) / duration, 1)\n"
    "      const e = ease(p)\n"
    "      setDisplayBal(Math.round(bal * e))\n"
    "      if (promoVal) setDisplayPromoVal(Math.round(promoVal * e))\n"
    "      if (p < 1) raf = requestAnimationFrame(tick)\n"
    "    }\n"
    "    raf = requestAnimationFrame(tick)\n"
    "    return () => cancelAnimationFrame(raf)\n"
    "  }, [visible, bal, promoVal])\n"
)

lines.insert(insert_after, ANIM_BLOCK)
print("P1b animation block inserted")

# c) Replace `{bal}` (the big metric number) and `{activePromo.value}% OFF` with animated values
#    We need the display to use displayBal / displayPromoVal
#    First find the WalletCardFront return section again (line numbers shifted)
wf_return = find_line(lines, "  return (", p1_sig)
wf_end    = find_line(lines, "\n// ─── WALLET CARD BACK", wf_return)

# Replace the metric fontSize:34 line
metric_line = find_line(lines, "fontSize:34, fontWeight:900", wf_return, wf_end)
if metric_line != -1:
    lines[metric_line] = lines[metric_line].replace(">+{bal}<", ">+{displayBal}<")
    print(f"P1c metric bal -> displayBal: line {metric_line+1}")

# Replace the card-number row (the 12 dots + bal)
num_line = find_line(lines, "●●●● ●●●● ●●●●", wf_return, wf_end)
if num_line != -1:
    # Find next line which has {bal}
    next_line = find_line(lines, ">{bal}<", num_line, num_line + 3)
    if next_line != -1:
        lines[next_line] = lines[next_line].replace(">{bal}<", ">{displayBal}<")
        print(f"P1c card-number bal -> displayBal: line {next_line+1}")

# Replace {activePromo.value}% OFF in the promoBadge string
promo_badge_line = find_line(lines, "${activePromo.value}% OFF", p1_sig, wf_end)
if promo_badge_line != -1:
    lines[promo_badge_line] = lines[promo_badge_line].replace(
        "`${activePromo.value}% OFF`",
        "`${displayPromoVal}% OFF`"
    )
    print(f"P1c promo value -> displayPromoVal: line {promo_badge_line+1}")
else:
    print("P1c promo line not found (ok if no promo)")

# ─── PATCH 2: WalletCard — pass visible + userId props ────────────────────────
wc_line = find_line(lines, "function WalletCard({")
assert wc_line != -1

# a) Add userId to WalletCard signature
lines[wc_line] = lines[wc_line].replace(
    "function WalletCard({ club, variant, isActive, onScrollTo, isMock })",
    "function WalletCard({ club, variant, isActive, onScrollTo, isMock, userId })"
)
print(f"P2a WalletCard signature: line {wc_line+1}")

# b) WalletCardFront gets visible prop
front_call = find_line(lines, "<WalletCardFront club={club} colors={colors} onFlip={flipCard}", wc_line)
if front_call != -1:
    lines[front_call] = lines[front_call].replace(
        "<WalletCardFront club={club} colors={colors} onFlip={flipCard} />",
        "<WalletCardFront club={club} colors={colors} onFlip={flipCard} visible={!flipped && isActive} />"
    )
    print(f"P2b WalletCardFront visible prop: line {front_call+1}")
else:
    print("P2b front_call not found")

# c) WalletCardBack gets userId prop
back_call = find_line(lines, "<WalletCardBack club={club} colors={colors} onFlip={flipCard}", wc_line)
if back_call != -1:
    lines[back_call] = lines[back_call].replace(
        "<WalletCardBack club={club} colors={colors} onFlip={flipCard} />",
        "<WalletCardBack club={club} colors={colors} onFlip={flipCard} userId={userId} />"
    )
    print(f"P2c WalletCardBack userId prop: line {back_call+1}")
else:
    print("P2c back_call not found")

# ─── PATCH 3: WalletView — accept + forward userId ────────────────────────────
wv_line = find_line(lines, "function WalletView({")
assert wv_line != -1
lines[wv_line] = lines[wv_line].replace(
    "function WalletView({ clubs, isMock })",
    "function WalletView({ clubs, isMock, userId })"
)
print(f"P3a WalletView signature: line {wv_line+1}")

# WalletCard calls inside WalletView — add userId={userId}
# Single-club shortcut:
sc_line = find_line(lines, "return <WalletCard club={clubs[0]}", wv_line)
if sc_line != -1:
    lines[sc_line] = lines[sc_line].replace(
        "return <WalletCard club={clubs[0]} variant=\"active\" isActive isMock={isMock} />",
        "return <WalletCard club={clubs[0]} variant=\"active\" isActive isMock={isMock} userId={userId} />"
    )
    print(f"P3b single-club WalletCard: line {sc_line+1}")

# Carousel WalletCard:
carousel_wc = find_line(lines, "<WalletCard club={club} variant=\"active\" isActive={isActive} isMock={isActive", wv_line)
if carousel_wc != -1:
    lines[carousel_wc] = lines[carousel_wc].replace(
        "<WalletCard club={club} variant=\"active\" isActive={isActive} isMock={isActive && isMock} />",
        "<WalletCard club={club} variant=\"active\" isActive={isActive} isMock={isActive && isMock} userId={userId} />"
    )
    print(f"P3c carousel WalletCard: line {carousel_wc+1}")

# ─── PATCH 4: ClientView — pass userId to WalletView ─────────────────────────
cv_wv = find_line(lines, "<WalletView clubs={memberships} isMock={false} />")
if cv_wv != -1:
    lines[cv_wv] = lines[cv_wv].replace(
        "<WalletView clubs={memberships} isMock={false} />",
        "<WalletView clubs={memberships} isMock={false} userId={user?.id} />"
    )
    print(f"P4 ClientView WalletView: line {cv_wv+1}")

# ─── PATCH 5: WalletCardBack — QR overlay + fix link ─────────────────────────
wb_line = find_line(lines, "function WalletCardBack({")
assert wb_line != -1

# a) Add userId to signature
lines[wb_line] = lines[wb_line].replace(
    "function WalletCardBack({ club, colors, onFlip })",
    "function WalletCardBack({ club, colors, onFlip, userId })"
)
print(f"P5a WalletCardBack signature: line {wb_line+1}")

# b) Add showQr state after the first const line (isStars)
isStars_line = find_line(lines, "const isStars = commerce?.prog_type", wb_line)
lines.insert(isStars_line + 1, "  const [showQr, setShowQr] = useState(false)\n")
print(f"P5b showQr state inserted after line {isStars_line+1}")

# c) Replace the entire return block of WalletCardBack
#    Find the return ( and closing }
wb_ret_start = find_line(lines, "  return (", wb_line)
# Find the next // section marker after the return
wb_ret_end = find_line(lines, "\n// ─── WALLET CARD (flip", wb_ret_start)
if wb_ret_end == -1:
    wb_ret_end = find_line(lines, "// ─── WALLET CARD (flip", wb_ret_start)
print(f"P5c WalletCardBack return: lines {wb_ret_start+1}..{wb_ret_end}")

NEW_BACK_RETURN = """\
  return (
    <div
      onClick={onFlip}
      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor:'pointer', position:'relative', userSelect:'none' }}
    >
      {/* QR overlay */}
      {showQr && (
        <div
          onClick={e => { e.stopPropagation(); setShowQr(false) }}
          style={{ position:'absolute', inset:0, background:colors.bg, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:20, backdropFilter:'blur(4px)' }}
        >
          <div style={{ background:'#fff', padding:12, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.40)' }}>
            <QRCodeSVG value={`CLUB-${userId || 'demo'}`} size={110} bgColor="#ffffff" fgColor="#0a0a0a" level="M" />
          </div>
          <div style={{ fontFamily:FN, fontSize:11, color:colors.textSub, marginTop:10, opacity:0.65 }}>tap para cerrar</div>
        </div>
      )}

      {/* Watermark */}
      <div style={{ position:'absolute', right:'-6%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0 }}>
        <BenefixWatermark color={colors.watermark} size={220} />
      </div>

      <div style={{ position:'absolute', inset:0, padding:'14px 16px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1 }}>

        {/* Row 1: Logo */}
        <div style={{ width:'22%', maxWidth:54, aspectRatio:'1', borderRadius:6, background: commerce?.img_url ? 'transparent' : 'rgba(255,255,255,0.12)', border:`1px solid ${colors.detail}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {commerce?.img_url
            ? <img src={commerce.img_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontFamily:FN, fontSize:'clamp(14px,4.5vw,20px)', fontWeight:900, color:colors.text, lineHeight:1 }}>{initial}</span>
          }
        </div>

        {/* Row 2: Two data blocks */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* Left: balance */}
          <div>
            <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:colors.text, lineHeight:1 }}>+{bal}</div>
            <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.11em', marginTop:1 }}>{unit}</div>
            {divider}
            <div style={{ fontFamily:FN, fontSize:7, fontWeight:600, color:colors.textSub, letterSpacing:'0.09em', textTransform:'uppercase' }}>VENCIMIENTO</div>
            <div style={{ fontFamily:FN, fontSize:10, fontWeight:800, color:colors.text, marginTop:2 }}>Sin vencimiento</div>
          </div>

          {/* Right: promo or next prize */}
          <div>
            {promoBadge ? (
              <>
                <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:colors.text, lineHeight:1 }}>{promoBadge}</div>
                <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em', marginTop:1 }}>{promoSub}</div>
                {divider}
                <div style={{ fontFamily:FN, fontSize:7, fontWeight:600, color:colors.textSub, letterSpacing:'0.09em', textTransform:'uppercase' }}>VENCIMIENTO</div>
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:800, color:colors.text, marginTop:2 }}>{promoExpiry || 'Sin vencimiento'}</div>
              </>
            ) : toNext !== null ? (
              <>
                <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:colors.text, lineHeight:1 }}>{toNext}</div>
                <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em', marginTop:1 }}>PARA PREMIO</div>
                {divider}
                <div style={{ fontFamily:FN, fontSize:7, fontWeight:600, color:colors.textSub, letterSpacing:'0.09em', textTransform:'uppercase' }}>OBJETIVO</div>
                <div style={{ fontFamily:FN, fontSize:10, fontWeight:800, color:colors.text, marginTop:2 }}>{commerce.prog_goal} {isStars ? 'est.' : 'pts'}</div>
              </>
            ) : null}
          </div>
        </div>

        {/* Row 3: CTA — stopPropagation wrapper prevents flip */}
        <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowQr(true) }}
            style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:`1px solid ${colors.detail}`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontFamily:FN, fontSize:10, fontWeight:700, color:colors.text, opacity:0.75 }}
          >
            <QrCode size={11} strokeWidth={2} color={colors.text} />
            Mi QR
          </button>
          {commerce?.slug
            ? <a
                href={`/club/${commerce.slug}`}
                onClick={e => e.stopPropagation()}
                style={{ display:'flex', alignItems:'center', gap:5, fontFamily:FN, fontSize:11, fontWeight:700, color:colors.text, textDecoration:'none', opacity:0.70 }}
              >
                <span>ir al club</span>
                <ArrowRight size={13} strokeWidth={2.5} color={colors.text} />
              </a>
            : <span style={{ fontFamily:FN, fontSize:10, color:colors.textSub, opacity:0.40 }}>tap para volver</span>
          }
        </div>
      </div>
    </div>
  )
}

"""

lines[wb_ret_start:wb_ret_end] = [NEW_BACK_RETURN]
print("P5c WalletCardBack return: OK")

# ─── WRITE ────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Done. Lines: {len(lines)}")
