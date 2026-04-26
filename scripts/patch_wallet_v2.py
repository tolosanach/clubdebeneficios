"""Line-number-based patch for WalletCardFront + WalletView."""
import sys

SRC = 'app/page.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
print(f"Total lines: {total}")

# ── PATCH 1: WalletCardFront return body (lines 3182-3239, 1-indexed) ─────────
# Replace lines 3182..3239 (0-indexed: 3181..3238 inclusive)
p1_start = 3181  # 0-indexed, line 3182
p1_end   = 3239  # 0-indexed exclusive (line 3239 is the closing })

# Verify markers
assert 'return (' in lines[p1_start], f"Expected 'return (' at line {p1_start+1}, got: {lines[p1_start]!r}"
assert lines[p1_end-1].strip() == '}', f"Expected closing brace at line {p1_end}, got: {lines[p1_end-1]!r}"

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
      <div style={{ position:'absolute', inset:0, padding:'14px 16px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1 }}>

        {/* Row 1: Logo top-left + metric top-right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
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

        {/* Row 2: Chip + card number (horizontal) */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ChipEMV color={colors.detail} />
          <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:500, color:colors.text, letterSpacing:'0.16em', opacity:0.88 }}>
            {'● ● ● ●'}&nbsp;&nbsp;{bal}
          </div>
        </div>

        {/* Row 3: Name + rating/category */}
        <div>
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

lines[p1_start:p1_end] = [NEW_FRONT_RETURN]
print("PATCH 1 (WalletCardFront return): OK")

# Recount lines after patch 1
# ── PATCH 2: WalletCard onFlip guards ─────────────────────────────────────────
# Find the lines after patch 1 shift

def find_line(lines, needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1

p2a = find_line(lines, "onFlip={() => setFlipped(true)}")
p2b = find_line(lines, "onFlip={() => setFlipped(false)}")

if p2a == -1 or p2b == -1:
    print(f"PATCH 2: not found (p2a={p2a}, p2b={p2b})")
    sys.exit(1)

lines[p2a] = lines[p2a].replace(
    "onFlip={() => setFlipped(true)}",
    "onFlip={isActive ? () => setFlipped(true) : undefined}"
)
lines[p2b] = lines[p2b].replace(
    "onFlip={() => setFlipped(false)}",
    "onFlip={isActive ? () => setFlipped(false) : undefined}"
)
print(f"PATCH 2 (WalletCard flip guards) at lines {p2a+1}, {p2b+1}: OK")

# ── PATCH 3: Replace WalletView ───────────────────────────────────────────────
p3_start = find_line(lines, "function WalletView(")
p3_end   = find_line(lines, "// ─── CLIENT PORTAL", p3_start)  # ─── CLIENT PORTAL

if p3_start == -1 or p3_end == -1:
    print(f"PATCH 3: markers not found (start={p3_start}, end={p3_end})")
    sys.exit(1)

# Go back one line to include the comment
comment_line = p3_start - 1
# Make sure the entire WalletView (comment + function) is replaced up to (not including) CLIENT PORTAL comment

NEW_WALLET_VIEW = """\
// ─── WALLET VIEW (cylindrical 3D carousel) ───────────────────────────────────────────
function WalletView({ clubs, isMock }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [stageW,      setStageW]      = useState(0)
  const containerRef = useRef(null)
  const touchStartY  = useRef(null)
  const navigating   = useRef(false)

  useEffect(() => {
    const compute = () => { if (containerRef.current) setStageW(containerRef.current.offsetWidth) }
    compute()
    const ro = new ResizeObserver(compute)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const navigate = useCallback((dir) => {
    if (navigating.current) return
    navigating.current = true
    setActiveIndex(i => Math.max(0, Math.min(clubs.length - 1, i + dir)))
    setTimeout(() => { navigating.current = false }, 520)
  }, [clubs.length])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (Math.abs(e.deltaY) > 8) navigate(e.deltaY > 0 ? 1 : -1)
  }, [navigate])

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartY.current === null) return
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(delta) > 35) navigate(delta > 0 ? 1 : -1)
    touchStartY.current = null
  }, [navigate])

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'ArrowDown') navigate(1)
      else if (e.key === 'ArrowUp') navigate(-1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate])

  if (clubs.length === 1) {
    return <WalletCard club={clubs[0]} variant="active" isActive isMock={isMock} />
  }

  const cardH      = stageW > 0 ? Math.round(stageW * 0.6304) : 220
  const containerH = cardH + 90

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        height: containerH,
        overflow: 'hidden',
        perspective: '900px',
        perspectiveOrigin: '50% 50%',
        touchAction: 'none',
      }}
    >
      {clubs.map((club, i) => {
        const offset   = i - activeIndex
        const abs      = Math.abs(offset)
        const isActive = offset === 0
        const sign     = offset > 0 ? 1 : -1

        let ty = 0, rx = 0, tz = 0, op = 1, sc = 1
        if (abs === 1) {
          ty = sign * cardH * 0.82
          rx = -sign * 48
          tz = -120
          op = 0.65
          sc = 0.90
        } else if (abs >= 2) {
          ty = sign * cardH * 1.55
          rx = -sign * 80
          tz = -280
          op = 0
        }

        const transform = abs === 0
          ? 'none'
          : `translateY(${ty}px) rotateX(${rx}deg) translateZ(${tz}px) scale(${sc})`

        return (
          <div
            key={club.id}
            onClick={!isActive ? () => setActiveIndex(i) : undefined}
            style={{
              position:  'absolute',
              top:       '50%',
              left:      0,
              right:     0,
              marginTop: `-${Math.round(cardH / 2)}px`,
              transform,
              transition: 'transform 500ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1)',
              opacity:    op,
              zIndex:     isActive ? 10 : 5 - abs,
              cursor:     isActive ? 'default' : 'pointer',
              pointerEvents: abs <= 1 ? 'auto' : 'none',
            }}
          >
            <WalletCard club={club} variant="active" isActive={isActive} isMock={isActive && isMock} />
          </div>
        )
      })}
    </div>
  )
}

"""

lines[comment_line:p3_end] = [NEW_WALLET_VIEW]
print(f"PATCH 3 (WalletView carousel) replacing lines {comment_line+1}..{p3_end}: OK")

with open(SRC, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Written. New line count: {len(lines)}")
