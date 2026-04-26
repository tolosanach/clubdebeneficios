"""Patch WalletCardFront layout + replace WalletView with cylindrical carousel."""
import sys

SRC = 'app/page.js'

with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)

# ── PATCH 1: WalletCardFront body ─────────────────────────────────────────────

OLD1 = (
    "      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor:'pointer', position:'relative', userSelect:'none' }}\n"
    "    >\n"
    "      {/* Content layer */}\n"
    "      <div style={{ position:'absolute', inset:0, padding:'14px 16px 12px', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1 }}>\n"
    "\n"
    "        {/* Row 1: Logo top-left + metric top-right */}\n"
    "        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>\n"
    "          <div style={{ width:44, height:44, borderRadius:8, background: commerce?.img_url ? 'transparent' : `${colors.detail}`, border:`1px solid ${colors.detail}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>\n"
    "            {commerce?.img_url\n"
    "              ? <img src={commerce.img_url} alt=\"\" style={{ width:'100%', height:'100%', objectFit:'cover' }} />\n"
    "              : <span style={{ fontFamily:FN, fontSize:18, fontWeight:900, color:colors.text, lineHeight:1 }}>{initial}</span>\n"
    "            }\n"
    "          </div>\n"
    "          <div style={{ textAlign:'right' }}>\n"
    "            <div style={{ fontFamily:FN, fontSize:28, fontWeight:900, color:colors.text, lineHeight:1, letterSpacing:'-0.02em' }}>+{bal}</div>\n"
    "            <div style={{ fontFamily:FN, fontSize:9, fontWeight:700, color:colors.textSub, letterSpacing:'0.11em', marginTop:1 }}>{unit}</div>\n"
    "            {promoBadge && (\n"
    "              <>\n"
    "                <div style={{ fontFamily:FN, fontSize:15, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', marginTop:5 }}>{promoBadge}</div>\n"
    "                <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em' }}>{promoSub}</div>\n"
    "              </>\n"
    "            )}\n"
    "          </div>\n"
    "        </div>\n"
    "\n"
    "        {/* Row 2: Chip EMV */}\n"
    "        <ChipEMV color={colors.detail} />\n"
    "\n"
    "        {/* Row 3: Fake card number */}\n"
    "        <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:500, color:colors.text, letterSpacing:'0.13em', opacity:0.90 }}>\n"
    "          {'● ● ● ● '}{bal}\n"
    "        </div>\n"
    "\n"
    "        {/* Row 4: Name + rating/category */}\n"
    "        <div>\n"
    "          <div style={{ fontFamily:FN, fontSize:13, fontWeight:900, color:colors.text, letterSpacing:'0.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'calc(100% - 16px)' }}>\n"
    "            {commerce?.name}\n"
    "          </div>\n"
    "          {(rating || catLabel) && (\n"
    "            <div style={{ fontFamily:FN, fontSize:9, color:colors.textSub, letterSpacing:'0.06em', marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'nowrap', overflow:'hidden' }}>\n"
    "              {rating && <span style={{ display:'flex', alignItems:'center', gap:2 }}><Star size={9} fill={colors.textSub} color={colors.textSub} strokeWidth={0} />{rating}</span>}\n"
    "              {rating && catLabel && <span style={{ opacity:0.45 }}>|</span>}\n"
    "              {catLabel && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{catLabel.toUpperCase()}</span>}\n"
    "            </div>\n"
    "          )}\n"
    "        </div>\n"
    "      </div>\n"
    "\n"
    "      {/* Watermark */}\n"
    "      <div style={{ position:'absolute', right:-14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>\n"
    "        <BenefixWatermark color={colors.watermark} size={116} />\n"
    "      </div>\n"
    "    </div>\n"
    "  )\n"
    "}"
)

NEW1 = (
    "      style={{ width:'100%', height:'100%', borderRadius:20, background:colors.bg, overflow:'hidden', cursor: onFlip ? 'pointer' : 'default', position:'relative', userSelect:'none' }}\n"
    "    >\n"
    "      {/* Watermark — behind everything */}\n"
    "      <div style={{ position:'absolute', right:'-6%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:0 }}>\n"
    "        <BenefixWatermark color={colors.watermark} size={220} />\n"
    "      </div>\n"
    "\n"
    "      {/* Content layer */}\n"
    "      <div style={{ position:'absolute', inset:0, padding:'14px 16px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1 }}>\n"
    "\n"
    "        {/* Row 1: Logo top-left + metric top-right */}\n"
    "        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>\n"
    "          <div style={{ width:'22%', maxWidth:54, aspectRatio:'1', borderRadius:6, background: commerce?.img_url ? 'transparent' : 'rgba(255,255,255,0.12)', border:`1px solid ${colors.detail}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>\n"
    "            {commerce?.img_url\n"
    "              ? <img src={commerce.img_url} alt=\"\" style={{ width:'100%', height:'100%', objectFit:'cover' }} />\n"
    "              : <span style={{ fontFamily:FN, fontSize:'clamp(14px,4.5vw,20px)', fontWeight:900, color:colors.text, lineHeight:1 }}>{initial}</span>\n"
    "            }\n"
    "          </div>\n"
    "          <div style={{ textAlign:'right' }}>\n"
    "            <div style={{ fontFamily:FN, fontSize:34, fontWeight:900, color:colors.text, lineHeight:1, letterSpacing:'-0.03em' }}>+{bal}</div>\n"
    "            <div style={{ fontFamily:FN, fontSize:9, fontWeight:700, color:colors.textSub, letterSpacing:'0.12em', marginTop:2, textTransform:'uppercase' }}>{unit}</div>\n"
    "            {promoBadge && (\n"
    "              <>\n"
    "                <div style={{ fontFamily:FN, fontSize:15, fontWeight:900, color:colors.text, letterSpacing:'-0.01em', marginTop:6 }}>{promoBadge}</div>\n"
    "                <div style={{ fontFamily:FN, fontSize:8, fontWeight:700, color:colors.textSub, letterSpacing:'0.09em' }}>{promoSub}</div>\n"
    "              </>\n"
    "            )}\n"
    "          </div>\n"
    "        </div>\n"
    "\n"
    "        {/* Row 2: Chip + card number (horizontal) */}\n"
    "        <div style={{ display:'flex', alignItems:'center', gap:10 }}>\n"
    "          <ChipEMV color={colors.detail} />\n"
    "          <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:500, color:colors.text, letterSpacing:'0.16em', opacity:0.88 }}>\n"
    "            {'● ● ● ●'}&nbsp;&nbsp;{bal}\n"
    "          </div>\n"
    "        </div>\n"
    "\n"
    "        {/* Row 3: Name + rating/category */}\n"
    "        <div>\n"
    "          <div style={{ fontFamily:FN, fontSize:17, fontWeight:900, color:colors.text, letterSpacing:'0.04em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>\n"
    "            {commerce?.name}\n"
    "          </div>\n"
    "          {(rating || catLabel) && (\n"
    "            <div style={{ fontFamily:FN, fontSize:12, color:colors.textSub, letterSpacing:'0.05em', marginTop:3, display:'flex', alignItems:'center', gap:4, flexWrap:'nowrap', overflow:'hidden' }}>\n"
    "              {rating && <span style={{ display:'flex', alignItems:'center', gap:2 }}><Star size={10} fill={colors.textSub} color={colors.textSub} strokeWidth={0} />{rating}</span>}\n"
    "              {rating && catLabel && <span style={{ opacity:0.40 }}>&nbsp;|&nbsp;</span>}\n"
    "              {catLabel && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{catLabel.toUpperCase()}</span>}\n"
    "            </div>\n"
    "          )}\n"
    "        </div>\n"
    "      </div>\n"
    "    </div>\n"
    "  )\n"
    "}"
)

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print("PATCH 1 (WalletCardFront): OK")
else:
    print("PATCH 1 (WalletCardFront): NOT FOUND")
    sys.exit(1)

# ── PATCH 2: WalletCard — only flip when isActive ─────────────────────────────

OLD2a = "            <WalletCardFront club={club} colors={colors} onFlip={() => setFlipped(true)} />"
NEW2a = "            <WalletCardFront club={club} colors={colors} onFlip={isActive ? () => setFlipped(true) : undefined} />"

OLD2b = "            <WalletCardBack club={club} colors={colors} onFlip={() => setFlipped(false)} />"
NEW2b = "            <WalletCardBack club={club} colors={colors} onFlip={isActive ? () => setFlipped(false) : undefined} />"

if OLD2a in content:
    content = content.replace(OLD2a, NEW2a, 1)
    print("PATCH 2a (WalletCard front flip): OK")
else:
    print("PATCH 2a: NOT FOUND")

if OLD2b in content:
    content = content.replace(OLD2b, NEW2b, 1)
    print("PATCH 2b (WalletCard back flip): OK")
else:
    print("PATCH 2b: NOT FOUND")

# ── PATCH 3: Replace entire WalletView with cylindrical carousel ──────────────

# Find the start and end markers
START_MARKER = "// ─── WALLET VIEW (scroll-driven swap) ────────────────────────────────────────────\nfunction WalletView"
END_MARKER   = "\n// ─── CLIENT PORTAL"

start_idx = content.find(START_MARKER)
end_idx   = content.find(END_MARKER, start_idx)

if start_idx == -1 or end_idx == -1:
    # Try without the box-drawing chars
    start_idx = content.find("function WalletView(")
    end_idx   = content.find("\n// ─── CLIENT PORTAL", start_idx)
    print(f"  Trying fallback: WalletView at {start_idx}, end at {end_idx}")

if start_idx == -1 or end_idx == -1:
    print("PATCH 3: markers not found")
    sys.exit(1)

# Go back to the comment line before function WalletView
line_start = content.rfind('\n', 0, start_idx) + 1

OLD3 = content[line_start:end_idx]

NEW3 = (
    "// ─── WALLET VIEW (cylindrical 3D carousel) ─────────────────────────────────────────\n"
    "function WalletView({ clubs, isMock }) {\n"
    "  const [activeIndex, setActiveIndex] = useState(0)\n"
    "  const [stageW,      setStageW]      = useState(0)\n"
    "  const containerRef = useRef(null)\n"
    "  const touchStartY  = useRef(null)\n"
    "  const navigating   = useRef(false)\n"
    "\n"
    "  useEffect(() => {\n"
    "    const compute = () => { if (containerRef.current) setStageW(containerRef.current.offsetWidth) }\n"
    "    compute()\n"
    "    const ro = new ResizeObserver(compute)\n"
    "    if (containerRef.current) ro.observe(containerRef.current)\n"
    "    return () => ro.disconnect()\n"
    "  }, [])\n"
    "\n"
    "  const navigate = useCallback((dir) => {\n"
    "    if (navigating.current) return\n"
    "    navigating.current = true\n"
    "    setActiveIndex(i => Math.max(0, Math.min(clubs.length - 1, i + dir)))\n"
    "    setTimeout(() => { navigating.current = false }, 520)\n"
    "  }, [clubs.length])\n"
    "\n"
    "  const handleWheel = useCallback((e) => {\n"
    "    e.preventDefault()\n"
    "    if (Math.abs(e.deltaY) > 8) navigate(e.deltaY > 0 ? 1 : -1)\n"
    "  }, [navigate])\n"
    "\n"
    "  const handleTouchStart = useCallback((e) => {\n"
    "    touchStartY.current = e.touches[0].clientY\n"
    "  }, [])\n"
    "\n"
    "  const handleTouchEnd = useCallback((e) => {\n"
    "    if (touchStartY.current === null) return\n"
    "    const delta = touchStartY.current - e.changedTouches[0].clientY\n"
    "    if (Math.abs(delta) > 35) navigate(delta > 0 ? 1 : -1)\n"
    "    touchStartY.current = null\n"
    "  }, [navigate])\n"
    "\n"
    "  useEffect(() => {\n"
    "    const handleKey = e => {\n"
    "      if (e.key === 'ArrowDown') navigate(1)\n"
    "      else if (e.key === 'ArrowUp') navigate(-1)\n"
    "    }\n"
    "    window.addEventListener('keydown', handleKey)\n"
    "    return () => window.removeEventListener('keydown', handleKey)\n"
    "  }, [navigate])\n"
    "\n"
    "  if (clubs.length === 1) {\n"
    "    return <WalletCard club={clubs[0]} variant=\"active\" isActive isMock={isMock} />\n"
    "  }\n"
    "\n"
    "  const cardH      = stageW > 0 ? Math.round(stageW * 0.6304) : 220\n"
    "  const containerH = cardH + 90\n"
    "\n"
    "  return (\n"
    "    <div\n"
    "      ref={containerRef}\n"
    "      onWheel={handleWheel}\n"
    "      onTouchStart={handleTouchStart}\n"
    "      onTouchEnd={handleTouchEnd}\n"
    "      style={{\n"
    "        position: 'relative',\n"
    "        height: containerH,\n"
    "        overflow: 'hidden',\n"
    "        perspective: '900px',\n"
    "        perspectiveOrigin: '50% 50%',\n"
    "        touchAction: 'none',\n"
    "      }}\n"
    "    >\n"
    "      {clubs.map((club, i) => {\n"
    "        const offset   = i - activeIndex\n"
    "        const abs      = Math.abs(offset)\n"
    "        const isActive = offset === 0\n"
    "        const sign     = offset > 0 ? 1 : -1\n"
    "\n"
    "        let ty = 0, rx = 0, tz = 0, op = 1, sc = 1\n"
    "        if (abs === 1) {\n"
    "          ty = sign * cardH * 0.82\n"
    "          rx = -sign * 48\n"
    "          tz = -120\n"
    "          op = 0.65\n"
    "          sc = 0.90\n"
    "        } else if (abs >= 2) {\n"
    "          ty = sign * cardH * 1.55\n"
    "          rx = -sign * 80\n"
    "          tz = -280\n"
    "          op = 0\n"
    "        }\n"
    "\n"
    "        const transform = abs === 0\n"
    "          ? 'none'\n"
    "          : `translateY(${ty}px) rotateX(${rx}deg) translateZ(${tz}px) scale(${sc})`\n"
    "\n"
    "        return (\n"
    "          <div\n"
    "            key={club.id}\n"
    "            onClick={!isActive ? () => setActiveIndex(i) : undefined}\n"
    "            style={{\n"
    "              position:  'absolute',\n"
    "              top:       '50%',\n"
    "              left:      0,\n"
    "              right:     0,\n"
    "              marginTop: `-${Math.round(cardH / 2)}px`,\n"
    "              transform,\n"
    "              transition: 'transform 500ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1)',\n"
    "              opacity:    op,\n"
    "              zIndex:     isActive ? 10 : 5 - abs,\n"
    "              cursor:     isActive ? 'default' : 'pointer',\n"
    "              pointerEvents: abs <= 1 ? 'auto' : 'none',\n"
    "            }}\n"
    "          >\n"
    "            <WalletCard club={club} variant=\"active\" isActive={isActive} isMock={isActive && isMock} />\n"
    "          </div>\n"
    "        )\n"
    "      })}\n"
    "    </div>\n"
    "  )\n"
    "}"
)

content = content[:line_start] + NEW3 + content[end_idx:]
print("PATCH 3 (WalletView carousel): OK")

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Written. Size: {original_len} -> {len(content)}")
