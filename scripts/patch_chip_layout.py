"""Patch: gold chip, 12-dot card number, name row lifted."""
import sys

SRC = 'app/page.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(lines, needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1

# ── PATCH 1: Replace ChipEMV with a realistic gold chip ───────────────────────
p1_start = find_line(lines, "function ChipEMV(")
p1_end   = find_line(lines, "}", p1_start) + 1  # closing brace of the function

# Verify
print(f"ChipEMV: lines {p1_start+1}..{p1_end}")
assert "ChipEMV" in lines[p1_start]

NEW_CHIP = """\
function ChipEMV() {
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" fill="none" aria-hidden="true">
      {/* Base gold body */}
      <rect x="0.5" y="0.5" width="43" height="33" rx="4.5" fill="#C9A227" stroke="#8B6914" strokeWidth="0.8"/>
      {/* Top-left highlight — metallic sheen */}
      <rect x="0.5" y="0.5" width="43" height="11" rx="4.5" fill="rgba(255,245,160,0.22)"/>
      {/* Vertical contact grooves */}
      <rect x="14"   y="0.5" width="1.2" height="33" fill="#7A5200" opacity="0.55"/>
      <rect x="28.8" y="0.5" width="1.2" height="33" fill="#7A5200" opacity="0.55"/>
      {/* Horizontal contact grooves */}
      <rect x="0.5" y="10.5" width="43" height="1.2" fill="#7A5200" opacity="0.55"/>
      <rect x="0.5" y="22.3" width="43" height="1.2" fill="#7A5200" opacity="0.55"/>
      {/* Centre contact pad — darker gold */}
      <rect x="15.2" y="11.7" width="13.6" height="10.6" rx="1.5" fill="#A67C00"/>
      {/* Sheen stripe on centre pad */}
      <rect x="15.2" y="11.7" width="13.6" height="3.2" rx="1.5" fill="rgba(255,248,180,0.28)"/>
    </svg>
  )
}
"""

lines[p1_start:p1_end] = [NEW_CHIP]
print("PATCH 1 (ChipEMV gold): OK")

# ── PATCH 2: Replace WalletCardFront return block ─────────────────────────────
# Find the return ( inside WalletCardFront (after the ChipEMV replacement above)
wf_start = find_line(lines, "function WalletCardFront(")
ret_start = find_line(lines, "  return (", wf_start)
ret_end   = find_line(lines, "\n// ─── WALLET CARD BACK", ret_start)  # next section

# Narrow: find the closing } of WalletCardFront
# It's the first standalone "}" after ret_start that closes the function
depth = 0
func_end = -1
for i in range(ret_start, len(lines)):
    for ch in lines[i]:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth < 0:
        func_end = i + 1
        break

print(f"WalletCardFront return: lines {ret_start+1}..{func_end}")

NEW_FRONT_RETURN = """\
  return (
    <div
      onClick={onFlip}
      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor: onFlip ? 'pointer' : 'default', position:'relative', userSelect:'none' }}
    >
      {/* Watermark — behind everything */}
      <div style={{ position:'absolute', right:'-6%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0 }}>
        <BenefixWatermark color={colors.watermark} size={220} />
      </div>

      {/* Content layer */}
      <div style={{ position:'absolute', inset:0, padding:'14px 16px 14px', display:'flex', flexDirection:'column', zIndex:1 }}>

        {/* Row 1: Logo top-left + metric top-right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <div style={{ width:'22%', maxWidth:54, aspectRatio:'1', borderRadius:6, background: commerce?.img_url ? 'transparent' : 'rgba(255,255,255,0.12)', border:`1px solid ${colors.detail}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {commerce?.img_url
              ? <img src={commerce.img_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontFamily:FN, fontSize:'clamp(14px,4.5vw,20px)', fontWeight:900, color:colors.text, lineHeight:1 }}>{initial}</span>
            }
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:FN, fontSize:34, fontWeight:900, color:colors.text, lineHeight:1, letterSpacing:'-0.03em' }}>+{bal}</div>
            <div style={{ fontFamily:FN, fontSize:9, fontWeight:700, color:colors.textSub, letterSpacing:'0.12em', marginTop:2, textTransform:'uppercase' }}>{unit}</div>
            {promoBadge && (
              <>
                <div style={{ fontFamily:FN, fontSize:15, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', marginTop:6 }}>{promoBadge}</div>
                <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em' }}>{promoSub}</div>
              </>
            )}
          </div>
        </div>

        {/* Spacer — pushes bottom group up from logo */}
        <div style={{ flex:1 }} />

        {/* Row 2: Chip (gold, standalone) */}
        <div style={{ flexShrink:0 }}>
          <ChipEMV />
        </div>

        {/* Row 3: 12 masked dots + balance */}
        <div style={{ marginTop:10, flexShrink:0, fontFamily:'monospace', fontSize:13, fontWeight:500, color:colors.text, letterSpacing:'0.18em', opacity:0.90, display:'flex', alignItems:'baseline', gap:10 }}>
          <span>{'●●●● ●●●● ●●●●'}</span>
          <span style={{ fontFamily:FN, fontSize:15, fontWeight:800, letterSpacing:'0.02em', opacity:1 }}>{bal}</span>
        </div>

        {/* Row 4: Name + rating/category */}
        <div style={{ marginTop:8, flexShrink:0 }}>
          <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:colors.text, letterSpacing:'0.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {commerce?.name}
          </div>
          {(rating || catLabel) && (
            <div style={{ fontFamily:FN, fontSize:12, color:colors.textSub, letterSpacing:'0.05em', marginTop:3, display:'flex', alignItems:'center', gap:4, flexWrap:'nowrap', overflow:'hidden' }}>
              {rating && <span style={{ display:'flex', alignItems:'center', gap:2 }}><Star size={10} fill={colors.textSub} color={colors.textSub} strokeWidth={0} />{rating}</span>}
              {rating && catLabel && <span style={{ opacity:0.40 }}>&nbsp;|&nbsp;</span>}
              {catLabel && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{catLabel.toUpperCase()}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
"""

lines[ret_start:func_end] = [NEW_FRONT_RETURN]
print("PATCH 2 (WalletCardFront layout): OK")

with open(SRC, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Done. New line count: {len(lines)}")
