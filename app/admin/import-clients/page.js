'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, Upload, Check, MessageCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const C = {
  bg:'#0a0a0f', card:'rgba(255,255,255,0.04)', cardH:'rgba(255,255,255,0.07)',
  rim:'rgba(255,255,255,0.12)', white:'#fff', mist:'#9B85CC', dust:'#8370AD',
  // Rebrand mayo 2026 fase 2: v migra a violeta brand sólido. o (naranja)
  // queda solo si se usa como acento semántico; G ahora es solid.
  v:'#7131E1', o:'#FE5000', ok:'#22E698', err:'#f87444', info:'#40C8FF',
}
const FN = "'Space Grotesk', system-ui, sans-serif"
// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#7131E1'

export default function ImportClientsPage() {
  const supabase = getSupabase()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Setup
  const [commerces, setCommerces] = useState([])
  const [commerceId, setCommerceId] = useState('')
  const [startingPoints, setStartingPoints] = useState(200)
  const [promoName, setPromoName] = useState('Descuento bienvenida')
  const [promoValue, setPromoValue] = useState(30)
  const [promoExpDate, setPromoExpDate] = useState('2026-05-31')

  // File
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)  // { rows, headers, columnMap }
  const [columnMap, setColumnMap] = useState({ name:'', phone:'', email:'' })
  const [parseError, setParseError] = useState('')

  // Import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // Blast
  const [grants, setGrants] = useState([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [waMessage, setWaMessage] = useState(
    'Hola {nombre} 👋 Te escribo de {comercio}. Renovamos el sistema de fidelización, ahora usamos Benefix.\n\n' +
    'Sumate al club acá 👉 https://benefix.com.ar/join/{slug}\n\n' +
    'Te regalo 200 puntos de bienvenida 🎁 y un 30% OFF en tu próxima visita (válido hasta el 31/05).\n\n' +
    'Cualquier duda me decís!'
  )
  const [sentMap, setSentMap] = useState({})
  const [tab, setTab] = useState('import')

  // Auth + load commerces
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthLoading(false); return }
      setUser(user)
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setProfile(p)
      if (p?.role === 'admin') {
        const { data: cs } = await supabase.from('commerces').select('id, name, slug').order('name')
        setCommerces(cs || [])
        if (cs?.length === 1) setCommerceId(cs[0].id)
      }
      setAuthLoading(false)
    })
  }, [])

  // Load sentMap from localStorage when commerceId changes
  useEffect(() => {
    if (!commerceId) return
    try {
      const raw = localStorage.getItem(`benefix:sentMap:${commerceId}`)
      if (raw) setSentMap(JSON.parse(raw))
      else setSentMap({})
    } catch { setSentMap({}) }
  }, [commerceId])

  function persistSent(map) {
    setSentMap(map)
    try { localStorage.setItem(`benefix:sentMap:${commerceId}`, JSON.stringify(map)) } catch {}
  }

  // Parse Excel/CSV
  async function handleFile(f) {
    setFile(f); setParsed(null); setParseError(''); setImportResult(null)
    if (!f) return
    try {
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type:'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval:null })
      if (rows.length === 0) throw new Error('La planilla parece vacía')
      const headers = Object.keys(rows[0])
      // Auto-detect columnas comunes
      const findCol = (candidates) =>
        headers.find(h => candidates.some(c => h.toLowerCase().includes(c))) || ''
      setColumnMap({
        name:  findCol(['cliente','nombre','name']),
        phone: findCol(['celular','tel','phone','móvil','movil','whatsapp']),
        email: findCol(['mail','email','correo']),
      })
      setParsed({ rows, headers })
    } catch (e) {
      setParseError(e.message || 'No pudimos leer la planilla')
    }
  }

  function previewClients() {
    if (!parsed || !columnMap.phone || !columnMap.name) return []
    return parsed.rows.slice(0, 5).map(r => ({
      name:  r[columnMap.name],
      phone: r[columnMap.phone],
      email: columnMap.email ? r[columnMap.email] : null,
    }))
  }

  async function doImport() {
    if (!commerceId) return alert('Elegí un comercio')
    if (!parsed || !columnMap.phone || !columnMap.name)
      return alert('Mapeá las columnas obligatorias (nombre, teléfono)')

    setImporting(true)
    const clients = parsed.rows.map(r => ({
      name:  r[columnMap.name],
      phone: r[columnMap.phone],
      email: columnMap.email ? r[columnMap.email] : null,
    }))

    const res = await fetch('/api/admin/import-grants', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        commerce_id: commerceId,
        clients,
        starting_points: parseInt(startingPoints) || 0,
        promo: promoValue ? {
          name:            promoName || 'Descuento bienvenida',
          value:           parseInt(promoValue),
          expiration_date: promoExpDate || null,
        } : null,
      }),
    })
    const data = await res.json()
    setImporting(false)
    if (!data.ok) return alert(`Error: ${data.error || 'Falla al importar'}`)
    setImportResult(data)
    loadGrants()
  }

  async function loadGrants() {
    if (!commerceId) return
    setGrantsLoading(true)
    const res = await fetch(`/api/admin/grants?commerce_id=${commerceId}`)
    const data = await res.json()
    setGrants(data.grants || [])
    setGrantsLoading(false)
  }

  useEffect(() => { if (tab === 'blast' && commerceId) loadGrants() }, [tab, commerceId])

  function buildWaUrl(g) {
    const commerce = commerces.find(c => c.id === commerceId)
    const msg = waMessage
      .replace(/\{nombre\}/g,  (g.name || '').split(' ')[0] || 'cliente')
      .replace(/\{comercio\}/g, commerce?.name || '')
      .replace(/\{slug\}/g,     commerce?.slug || '')
    return `https://wa.me/${g.phone}?text=${encodeURIComponent(msg)}`
  }

  function markSent(grantId) {
    persistSent({ ...sentMap, [grantId]: true })
  }

  // Loading / auth states
  if (authLoading) return <Wrapper><div style={{ padding:60, textAlign:'center', color:C.dust }}>Cargando…</div></Wrapper>
  if (!user) return <Wrapper><div style={{ padding:60, textAlign:'center' }}>
    <div style={{ fontSize:18, color:C.white, fontFamily:FN, fontWeight:700, marginBottom:8 }}>Necesitás iniciar sesión</div>
    <div style={{ color:C.mist, fontSize:13 }}>Esta página es solo para administradores.</div>
  </div></Wrapper>
  if (profile?.role !== 'admin') return <Wrapper><div style={{ padding:60, textAlign:'center' }}>
    <div style={{ fontSize:18, color:C.white, fontFamily:FN, fontWeight:700, marginBottom:8 }}>Acceso restringido</div>
    <div style={{ color:C.mist, fontSize:13 }}>Esta página es solo para administradores.</div>
  </div></Wrapper>

  return (
    <Wrapper>
      <div style={{ maxWidth:920, margin:'0 auto', padding:'24px 18px 80px' }}>
        <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.55)', fontSize:13, marginBottom:18, textDecoration:'none' }}>
          <ChevronLeft size={16} /> Volver
        </Link>
        <h1 style={{ fontFamily:FN, fontSize:28, fontWeight:900, color:C.white, marginBottom:6, letterSpacing:'-.02em' }}>Importar clientes</h1>
        <p style={{ fontSize:13, color:C.mist, marginBottom:24, lineHeight:1.6 }}>
          Subí un Excel/CSV con clientes existentes de un comercio. Cada cliente recibe puntos
          de bienvenida + un descuento (opcional) que se le aplican automáticamente cuando se
          suma al club por primera vez.
        </p>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:24, borderBottom:`1px solid ${C.rim}`, paddingBottom:0 }}>
          {[
            { id:'import', label:'1. Importar' },
            { id:'blast',  label:'2. Mandar WhatsApp' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 18px', background:'transparent', border:'none', borderBottom: tab===t.id ? `2px solid ${C.v}` : '2px solid transparent', color: tab===t.id ? C.white : C.mist, fontFamily:FN, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'import' && (
          <>
            {/* Comercio */}
            <Section title="Comercio destino">
              <select value={commerceId} onChange={e => setCommerceId(e.target.value)}
                style={input}>
                <option value="">Elegí un comercio</option>
                {commerces.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Section>

            {/* Promo + puntos */}
            <Section title="Configuración del regalo de bienvenida">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Puntos de bienvenida</label>
                  <input type="number" min={0} value={startingPoints} onChange={e => setStartingPoints(e.target.value)} style={input} />
                </div>
                <div>
                  <label style={lbl}>% Descuento próxima visita</label>
                  <input type="number" min={0} max={100} value={promoValue} onChange={e => setPromoValue(e.target.value)} style={input} />
                </div>
                <div>
                  <label style={lbl}>Nombre de la promo</label>
                  <input type="text" value={promoName} onChange={e => setPromoName(e.target.value)} style={input} placeholder="Descuento bienvenida" />
                </div>
                <div>
                  <label style={lbl}>Vencimiento</label>
                  <input type="date" value={promoExpDate} onChange={e => setPromoExpDate(e.target.value)} style={input} />
                </div>
              </div>
            </Section>

            {/* Archivo */}
            <Section title="Archivo de clientes">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files[0])}
                style={{ display:'block', color:C.mist, fontSize:13 }} />
              {parseError && <div style={{ color:C.err, fontSize:12, marginTop:8 }}>{parseError}</div>}

              {parsed && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:12, color:C.mist, marginBottom:8 }}>Detectamos {parsed.rows.length} filas. Mapeá las columnas:</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    {[
                      { key:'name',  label:'Nombre *', required:true },
                      { key:'phone', label:'Teléfono *', required:true },
                      { key:'email', label:'Email (opcional)', required:false },
                    ].map(({ key, label, required }) => (
                      <div key={key}>
                        <label style={lbl}>{label}</label>
                        <select value={columnMap[key]} onChange={e => setColumnMap({ ...columnMap, [key]:e.target.value })} style={input}>
                          <option value="">-- elegí --</option>
                          {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {/* Preview */}
                  {columnMap.name && columnMap.phone && (
                    <div style={{ marginTop:14, fontSize:11, color:C.mist }}>
                      <div style={{ marginBottom:6 }}>Preview (primeros 5):</div>
                      <table style={{ width:'100%', fontSize:11, color:C.dust }}>
                        <thead><tr style={{ color:C.mist }}>
                          <th align="left">Nombre</th><th align="left">Teléfono</th><th align="left">Email</th>
                        </tr></thead>
                        <tbody>
                          {previewClients().map((c, i) => (
                            <tr key={i}><td>{c.name}</td><td>{String(c.phone)}</td><td>{c.email || '—'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <button onClick={doImport} disabled={!parsed || !commerceId || !columnMap.name || !columnMap.phone || importing}
              style={{ ...btnPrimary, opacity:(!parsed || !commerceId || !columnMap.name || !columnMap.phone || importing) ? .5 : 1 }}>
              {importing ? 'Importando...' : 'Importar clientes'}
            </button>

            {importResult && (
              <div style={{ marginTop:18, padding:'14px 16px', background:`${C.ok}14`, border:`1px solid ${C.ok}55`, borderRadius:14 }}>
                <div style={{ fontFamily:FN, fontWeight:700, color:C.ok, marginBottom:8 }}>✓ Importación completa</div>
                <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:C.mist, lineHeight:1.7 }}>
                  <li>Total recibido: {importResult.total_received}</li>
                  <li>Insertados: <strong style={{ color:C.white }}>{importResult.inserted}</strong></li>
                  <li>Ya existían: {importResult.already_existed}</li>
                  <li>Sin teléfono válido: {importResult.skipped_no_phone}</li>
                  <li>Duplicados en el archivo: {importResult.skipped_duplicate}</li>
                </ul>
                <button onClick={() => setTab('blast')} style={{ ...btnSecondary, marginTop:12 }}>
                  → Pasar a mandar WhatsApp
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'blast' && (
          <>
            <Section title="Comercio">
              <select value={commerceId} onChange={e => setCommerceId(e.target.value)} style={input}>
                <option value="">Elegí un comercio</option>
                {commerces.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Section>

            <Section title="Plantilla del mensaje">
              <p style={{ fontSize:11, color:C.dust, marginBottom:6 }}>
                Variables: <code>{'{nombre}'}</code>, <code>{'{comercio}'}</code>, <code>{'{slug}'}</code>
              </p>
              <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={7}
                style={{ ...input, fontFamily:'inherit', resize:'vertical' }} />
            </Section>

            <Section title={`Lista de clientes (${grants.length})`}>
              {grantsLoading && <div style={{ color:C.mist, fontSize:13 }}>Cargando...</div>}
              {!grantsLoading && grants.length === 0 && (
                <div style={{ color:C.mist, fontSize:13, textAlign:'center', padding:'40px 20px' }}>
                  No hay clientes importados todavía. Volvé al paso 1 e importá la planilla.
                </div>
              )}
              {grants.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ fontSize:11, color:C.dust, marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                    <span>Pendientes: {grants.filter(g => !sentMap[g.id] && !g.applied_at).length}</span>
                    <span>Mandados: {Object.keys(sentMap).filter(k => sentMap[k]).length}</span>
                    <span>Ya en Benefix: {grants.filter(g => g.applied_at).length}</span>
                  </div>
                  {grants.map(g => {
                    const isApplied = !!g.applied_at
                    const isSent    = !!sentMap[g.id]
                    return (
                      <div key={g.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.card, border:`1px solid ${C.rim}`, borderRadius:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name || '(sin nombre)'}</div>
                          <div style={{ fontSize:11, color:C.dust, fontFamily:'monospace' }}>+{g.phone}</div>
                        </div>
                        {isApplied && (
                          <span style={{ fontSize:10, color:C.ok, background:`${C.ok}22`, padding:'3px 8px', borderRadius:99, fontWeight:700, fontFamily:FN }}>
                            ✓ EN BENEFIX
                          </span>
                        )}
                        {!isApplied && (
                          <>
                            <a href={buildWaUrl(g)} target="_blank" rel="noopener noreferrer"
                              onClick={() => markSent(g.id)}
                              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', background: isSent ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#25D366,#128C7E)', color: isSent ? C.dust : '#fff', borderRadius:8, textDecoration:'none', fontSize:11, fontFamily:FN, fontWeight:700 }}>
                              <MessageCircle size={12} />
                              {isSent ? 'Reenviar' : 'WhatsApp'}
                            </a>
                            {isSent && (
                              <button onClick={() => persistSent({ ...sentMap, [g.id]: false })}
                                style={{ background:'transparent', border:'none', color:C.dust, fontSize:10, cursor:'pointer', padding:0 }}>
                                desmarcar
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            <div style={{ marginTop:18, padding:'12px 14px', background:`${C.info}11`, border:`1px solid ${C.info}33`, borderRadius:10, fontSize:12, color:C.mist, lineHeight:1.7 }}>
              <strong style={{ color:C.white, fontFamily:FN }}>⚠ Tip:</strong> No mandes 350 mensajes seguidos —
              WhatsApp puede flagearte como spam. Distribuilo en 5-7 días, máximo 50/día,
              espaciado en horarios. La marca de "Mandado" se guarda en este browser para que sepas dónde quedaste.
            </div>
          </>
        )}
      </div>
    </Wrapper>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom:22 }}>
    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:10, letterSpacing:'.02em', textTransform:'uppercase' }}>{title}</div>
    {children}
  </div>
)

const Wrapper = ({ children }) => (
  <div style={{ minHeight:'100vh', background:C.bg, color:C.white, fontFamily:'Inter, system-ui, sans-serif' }}>
    {children}
  </div>
)

const lbl = { fontSize:11, color:C.mist, fontWeight:700, marginBottom:6, display:'block' }
const input = {
  width:'100%', background:'rgba(0,0,0,0.30)', border:`1px solid ${C.rim}`, borderRadius:10,
  padding:'10px 12px', color:C.white, fontSize:13, boxSizing:'border-box', fontFamily:'inherit',
}
const btnPrimary = {
  display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px',
  background:G, color:'#fff', border:'none', borderRadius:12, cursor:'pointer',
  fontFamily:FN, fontSize:14, fontWeight:700,
  boxShadow:'0 4px 18px rgba(113,49,225,0.42)',
}
const btnSecondary = {
  display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px',
  background:'rgba(255,255,255,0.08)', color:'#fff', border:`1px solid ${C.rim}`,
  borderRadius:10, cursor:'pointer', fontFamily:FN, fontSize:12, fontWeight:700,
  textDecoration:'none',
}
