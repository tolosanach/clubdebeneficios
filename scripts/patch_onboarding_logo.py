"""Add logo upload as step 2 in OnboardingView (shifts steps 2-9 → 3-10, TOTAL 9→10)."""

SRC = 'app/page.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(lines, needle, start=0, end=None):
    for i in range(start, end if end is not None else len(lines)):
        if needle in lines[i]:
            return i
    return -1

ob_start = find_line(lines, "function OnboardingView(")
assert ob_start != -1

# ── 1: TOTAL 9 → 10 ──────────────────────────────────────────────────────────
total_line = find_line(lines, "  const TOTAL   = 9", ob_start, ob_start + 10)
assert total_line != -1
lines[total_line] = lines[total_line].replace("const TOTAL   = 9", "const TOTAL   = 10")
print(f"TOTAL 9->10: line {total_line+1}")

# ── 2: Add logoUrl + uploadingLogo state after existing state declarations ────
# Find the uploadingLogo state… it doesn't exist yet in OnboardingView.
# Insert after `const [upgradeModal, ...` line
upgrade_line = find_line(lines, "const [upgradeModal, setUpgradeModal]", ob_start, ob_start + 20)
assert upgrade_line != -1
new_states = (
    "  const [logoUrl,      setLogoUrl]      = useState(commerce?.img_url || null)\n"
    "  const [uploadingLogo, setUploadingLogo] = useState(false)\n"
)
lines.insert(upgrade_line + 1, new_states)
print(f"States inserted after line {upgrade_line+1}")

# ── 3: Add handleLogoUpload function after savePrize ─────────────────────────
save_prize_end = find_line(lines, "    setSaving(false)\n    next()\n  }\n\n  async function runSimulation", ob_start)
if save_prize_end == -1:
    # Find closing of savePrize differently
    save_prize_end = find_line(lines, "  async function runSimulation", ob_start, ob_start + 100)
assert save_prize_end != -1

logo_fn = (
    "  async function handleLogoUpload(file) {\n"
    "    setUploadingLogo(true)\n"
    "    const ext  = file.name.split('.').pop()\n"
    "    const path = `${commerce.id}/logo.${ext}`\n"
    "    const { error } = await supabase.storage.from('commerce-images').upload(path, file, { upsert: true })\n"
    "    if (!error) {\n"
    "      const { data } = supabase.storage.from('commerce-images').getPublicUrl(path)\n"
    "      await supabase.from('commerces').update({ img_url: data.publicUrl }).eq('id', commerce.id)\n"
    "      setLogoUrl(data.publicUrl)\n"
    "    }\n"
    "    setUploadingLogo(false)\n"
    "  }\n\n"
)
lines.insert(save_prize_end, logo_fn)
print(f"handleLogoUpload inserted before line {save_prize_end+1}")

# ── 4: canSkip: step===4 → step===2||step===5  + showHeader/progressPct ───────
# Find canSkip line
can_skip_line = find_line(lines, "  const canSkip     = step === 4", ob_start, ob_start + 30)
if can_skip_line != -1:
    lines[can_skip_line] = lines[can_skip_line].replace(
        "const canSkip     = step === 4",
        "const canSkip     = step === 2 || step === 5"
    )
    print(f"canSkip updated: line {can_skip_line+1}")

show_header_line = find_line(lines, "const showHeader  = step >= 2 && step <= 5", ob_start, ob_start + 30)
if show_header_line != -1:
    lines[show_header_line] = lines[show_header_line].replace(
        "const showHeader  = step >= 2 && step <= 5",
        "const showHeader  = step >= 2 && step <= 6"
    )
    print(f"showHeader updated: line {show_header_line+1}")

progress_line = find_line(lines, "const progressPct = step >= 2 && step <= 5", ob_start, ob_start + 30)
if progress_line != -1:
    lines[progress_line] = lines[progress_line].replace(
        "const progressPct = step >= 2 && step <= 5 ? ((step - 1) / 4) * 100 : 0",
        "const progressPct = step >= 2 && step <= 6 ? ((step - 2) / 4 * 100) : 0"
    )
    print(f"progressPct updated: line {progress_line+1}")

# ── 5: Rename old steps 2-9 → 3-10 (work in reverse to avoid collisions) ─────
# Step names & comments to rename
renames = [
    ("// ── STEP 9: FINAL ──",                   "// ── STEP 10: FINAL ──"),
    ("  if (step === 9)",                          "  if (step === 10)"),
    ("// ── STEP 8: PROMOCIONES",                 "// ── STEP 9: PROMOCIONES"),
    ("  if (step === 8)",                          "  if (step === 9)"),
    ("// ── STEP 7: LÍMITES DEL PLAN ──",         "// ── STEP 8: LÍMITES DEL PLAN ──"),
    ("  if (step === 7)",                          "  if (step === 8)"),
    ("// ── STEP 6: RESULTADO / AHA MOMENT ──",   "// ── STEP 7: RESULTADO / AHA MOMENT ──"),
    ("  if (step === 6)",                          "  if (step === 7)"),
    ("// ── STEP 5: SIMULACIÓN ──",               "// ── STEP 6: SIMULACIÓN ──"),
    ("  if (step === 5)",                          "  if (step === 6)"),
    ("// ── STEP 4: EXPLICACIÓN QR ──",           "// ── STEP 5: EXPLICACIÓN QR ──"),
    ("  if (step === 4)",                          "  if (step === 5)"),
    ("// ── STEP 3: PRIMER PREMIO ──",            "// ── STEP 4: PRIMER PREMIO ──"),
    ("  if (step === 3)",                          "  if (step === 4)"),
    ("// ── STEP 2: SISTEMA DE FIDELIZACIÓN ──",  "// ── STEP 3: SISTEMA DE FIDELIZACIÓN ──"),
    ("  if (step === 2)",                          "  if (step === 3)"),
]

for old, new in renames:
    idx = find_line(lines, old, ob_start)
    if idx != -1:
        lines[idx] = lines[idx].replace(old, new, 1)
        print(f"  step renumbered at line {idx+1}")
    else:
        print(f"  WARNING: '{old[:40]}' not found")

# ── 6: Insert new STEP 2 (logo) before STEP 3 ────────────────────────────────
step3_line = find_line(lines, "  // ── STEP 3: SISTEMA DE FIDELIZACIÓN ──", ob_start)
assert step3_line != -1, "Step 3 comment not found"

NEW_STEP2 = (
    "  // ── STEP 2: LOGO DEL NEGOCIO ──\n"
    "  if (step === 2) return (\n"
    "    <Wrap>\n"
    "      <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>La cara de tu negocio</div>\n"
    "      <div style={{ fontSize:13, color:C.mist, marginBottom:28, lineHeight:1.6 }}>\n"
    "        Tu logo aparece en las tarjetas de fidelización y en el directorio. Podés agregarlo ahora o después.\n"
    "      </div>\n"
    "\n"
    "      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, marginBottom:32 }}>\n"
    "        <div style={{ width:100, height:100, borderRadius:24, background: logoUrl ? 'transparent' : C.bg3, border:`2px dashed ${logoUrl ? 'transparent' : C.rim}`, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>\n"
    "          {logoUrl\n"
    "            ? <img src={logoUrl} alt=\"\" style={{ width:'100%', height:'100%', objectFit:'cover' }} />\n"
    "            : <Building2 size={36} color={C.rim} strokeWidth={1.5} />\n"
    "          }\n"
    "        </div>\n"
    "\n"
    "        <input type=\"file\" accept=\"image/*\" id=\"logo-upload-ob\" style={{ display:'none' }}\n"
    "          onChange={e => { if (e.target.files[0]) handleLogoUpload(e.target.files[0]); e.target.value='' }} />\n"
    "\n"
    "        <label htmlFor=\"logo-upload-ob\"\n"
    "          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:12, cursor: uploadingLogo ? 'default' : 'pointer', fontSize:13, color: uploadingLogo ? C.dust : C.pearl, pointerEvents: uploadingLogo ? 'none' : 'auto' }}>\n"
    "          <Upload size={13} strokeWidth={2} />\n"
    "          {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}\n"
    "        </label>\n"
    "\n"
    "        {logoUrl && (\n"
    "          <div style={{ fontSize:11, color:C.ok, display:'flex', alignItems:'center', gap:5 }}>\n"
    "            <CheckCircle size={12} strokeWidth={2} color={C.ok} /> Logo guardado\n"
    "          </div>\n"
    "        )}\n"
    "      </div>\n"
    "\n"
    "      <GBtn onClick={next} disabled={uploadingLogo} style={{ width:'100%', justifyContent:'center', fontSize:14, padding:'13px' }}>\n"
    "        {logoUrl ? 'Continuar →' : 'Continuar sin logo →'}\n"
    "      </GBtn>\n"
    "    </Wrap>\n"
    "  )\n"
    "\n"
)

lines.insert(step3_line, NEW_STEP2)
print(f"Step 2 (logo) inserted before line {step3_line+1}")

# ── WRITE ─────────────────────────────────────────────────────────────────────
with open(SRC, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Done. Lines: {len(lines)}")
