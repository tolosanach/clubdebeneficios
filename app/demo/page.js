'use client'
import { useState } from 'react'

const FN = "'Space Grotesk', sans-serif"
const FI = "'Inter', sans-serif"
const C = {
  bg:'transparent', bg2:'rgba(255,255,255,0.05)', bg3:'rgba(255,255,255,0.04)', rim:'rgba(255,255,255,0.10)',
  mist:'#9B85CC', dust:'#5C4A88', white:'#F0EDFF', pearl:'#E2DEFF',
  v:'#BD4BF8', o:'#F5A623', ok:'#22C55E', warn:'#F59E0B',
  accent:'#a855f7', info:'#38BDF8',
}
const G  = 'linear-gradient(135deg,#FE5000,#BD4BF8)'
const GV = 'linear-gradient(135deg,#7C5CFC,#BD4BF8)'

// ── Datos de demo ──────────────────────────────────────────────────────────────
const DEMO_COMMERCE = {
  id:'demo', name:'Café El Encuentro', category:'Gastronomía', plan:'pro',
  prog_type:'points', prog_pts:1,
  description:'El mejor café de la ciudad. Pastas caseras, desayunos especiales y el mejor ambiente para trabajar o reunirse.',
  address:'Av. San Martín 640, General Pico', lat:-36.6145, lng:-64.2931,
  phone:'2302123456', instagram:'@cafeelencuentro', facebook:'facebook.com/cafeelencuentro',
  hours:'Lunes a viernes 8 a 20hs · Sábados 9 a 14hs',
  img_url:'', logo_url:'',
}
const DEMO_MEMBERS = [
  { id:'m1', user_id:'u1', points:28, stars:0, visits_count:8,  last_visit: daysAgo(1),  profiles:{ full_name:'María González',   avatar_url:'' } },
  { id:'m2', user_id:'u2', points:15, stars:0, visits_count:4,  last_visit: daysAgo(3),  profiles:{ full_name:'Carlos Ramírez',   avatar_url:'' } },
  { id:'m3', user_id:'u3', points:9,  stars:0, visits_count:3,  last_visit: daysAgo(5),  profiles:{ full_name:'Laura Sánchez',    avatar_url:'' } },
  { id:'m4', user_id:'u4', points:32, stars:0, visits_count:12, last_visit: daysAgo(0),  profiles:{ full_name:'Tomás Herrera',    avatar_url:'' } },
  { id:'m5', user_id:'u5', points:5,  stars:0, visits_count:2,  last_visit: daysAgo(9),  profiles:{ full_name:'Ana Fernández',    avatar_url:'' } },
  { id:'m6', user_id:'u6', points:21, stars:0, visits_count:7,  last_visit: daysAgo(2),  profiles:{ full_name:'Diego Morales',    avatar_url:'' } },
  { id:'m7', user_id:'u7', points:3,  stars:0, visits_count:1,  last_visit: daysAgo(2),  profiles:{ full_name:'Sofía Torres',     avatar_url:'' } },
  { id:'m8', user_id:'u8', points:0,  stars:0, visits_count:1,  last_visit: daysAgo(1),  profiles:{ full_name:'Martín López',     avatar_url:'' } },
  { id:'m9', user_id:'u9', points:18, stars:0, visits_count:6,  last_visit: daysAgo(12), profiles:{ full_name:'Valeria Castro',   avatar_url:'' } },
  { id:'m10',user_id:'u10',points:7,  stars:0, visits_count:3,  last_visit: daysAgo(15), profiles:{ full_name:'Facundo Ruiz',     avatar_url:'' } },
]
const DEMO_PRIZES = [
  { id:'p1', name:'Café gratis',       cost:10, active:true,  stock:null,  img_url:'' },
  { id:'p2', name:'Medialunas x4',     cost:6,  active:true,  stock:3,     img_url:'' },
  { id:'p3', name:'20% OFF en tu visita', cost:20, active:true, stock:null, img_url:'' },
]
const DEMO_PROMOS = [
  { id:'pr1', type:'discount', description:'10% OFF próxima visita', discount_pct:10, active:true, expires_at: daysFromNow(14) },
]
const DEMO_ACTIVITY = [
  { id:'a1', type:'scan',           description:'María González sumó 1 punto',          created_at: daysAgo(0) },
  { id:'a2', type:'prize_redeemed', description:'Tomás Herrera canjeó "Café gratis"',   created_at: daysAgo(0) },
  { id:'a3', type:'scan',           description:'Diego Morales sumó 1 punto',            created_at: daysAgo(1) },
  { id:'a4', type:'scan',           description:'Martín López sumó 1 punto · 1ª visita',created_at: daysAgo(1) },
  { id:'a5', type:'scan',           description:'Sofía Torres sumó 1 punto · 1ª visita',created_at: daysAgo(2) },
  { id:'a6', type:'settings',       description:'Perfil del negocio actualizado',        created_at: daysAgo(3) },
]

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString()
}

// ── Helpers UI ─────────────────────────────────────────────────────────────────
function PCard({ children, style }) {
  return <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:14, ...style }}>{children}</div>
}
function GBtn({ children, onClick, style, disabled, outline }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, border: outline ? `1px solid ${C.v}` : 'none', background: outline ? 'transparent' : GV, color:'#fff', fontFamily:FN, fontSize:13, fontWeight:700, cursor:disabled?'not-allowed':'pointer', opacity:disabled?.6:1, ...style }}>
      {children}
    </button>
  )
}
function Spinner() {
  return null
}
function Avatar({ name, size=36 }) {
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${C.accent}33`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FN, fontSize:size*0.35, fontWeight:700, color:C.accent, flexShrink:0 }}>
      {initials}
    </div>
  )
}

// ── DEMO PAGE ──────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [tab, setTab]           = useState('dashboard')
  const [saved, setSaved]       = useState(false)
  const [members]               = useState(DEMO_MEMBERS)
  const [prizes, setPrizes]     = useState(DEMO_PRIZES)
  const [promos]                = useState(DEMO_PROMOS)
  const [isMobile]              = useState(false)
  const [showCTA, setShowCTA]   = useState(false)
  const [autoDetail, setAutoDetail] = useState(null)

  function fakeSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const cheapest     = prizes.filter(p=>p.active).sort((a,b)=>a.cost-b.cost)[0]
  const inactiveClients = members.filter(m => m.last_visit < daysAgo(7))
  const nearPrize       = cheapest ? members.filter(m => m.points >= cheapest.cost * 0.8 && m.points < cheapest.cost) : []
  const firstVisit      = members.filter(m => m.visits_count === 1 && m.last_visit >= daysAgo(7))

  const autoClients = { reactivacion: inactiveClients, cercaPremio: nearPrize, primeraVisita: firstVisit }
  const AUTO_META   = {
    reactivacion:  { icon:'🔁', label:'Reactivar inactivos',  color:'#6366F1' },
    cercaPremio:   { icon:'🎯', label:'Cerca de premio',       color:'#F59E0B' },
    primeraVisita: { icon:'🎉', label:'Bienvenida 1ª visita',  color:'#22C55E' },
  }
  const totalDetected = Object.values(autoClients).reduce((s,a)=>s+a.length,0)

  function buildMsg(type, m) {
    const n = m.profiles.full_name.split(' ')[0]
    if (type==='reactivacion')  return `Hola ${n}! Hace unos días que no venís 😄\nTe esperamos esta semana para que sigas sumando beneficios en ${DEMO_COMMERCE.name} 🎁`
    if (type==='cercaPremio')   return `Hola ${n}! Estás a solo ${cheapest.cost - m.points} punto(s) de tu recompensa 🎁\n¡Vení a ${DEMO_COMMERCE.name} y aprovechala!`
    if (type==='primeraVisita') return `Hola ${n}! Gracias por tu primera visita 🙌\nYa empezaste a sumar beneficios en ${DEMO_COMMERCE.name}. ¡Te esperamos pronto!`
  }

  const MENU = [
    { id:'dashboard',       icon:'📊', label:'Dashboard'        },
    { id:'clientes',        icon:'👥', label:'Clientes'         },
    { id:'premios',         icon:'🎁', label:'Premios'          },
    { id:'promociones',     icon:'🔥', label:'Promociones'      },
    { id:'automatizaciones',icon:'🤖', label:'Automatizaciones' },
    { id:'historial',       icon:'📋', label:'Historial'        },
    { id:'configuracion',   icon:'⚙️', label:'Configuración'   },
  ]

  const SectionTitle = ({ icon, children }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{children}</div>
      <div style={{ flex:1, height:1, background:C.rim, marginLeft:4 }} />
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:FI }}>

      {/* ── BANNER DEMO ── */}
      <div style={{ background:`linear-gradient(135deg, #1a1230, #0d1a2e)`, borderBottom:`1px solid ${C.accent}44`, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, background:`${C.accent}22`, border:`1px solid ${C.accent}44`, borderRadius:99, padding:'2px 10px', color:C.accent, fontFamily:FN, fontSize:11, fontWeight:700 }}>🎯 MODO DEMO</span>
          <span style={{ fontSize:12, color:C.mist }}>Explorá todas las funciones · Los cambios no se guardan</span>
        </div>
        <button
          onClick={() => setShowCTA(true)}
          style={{ background:G, border:'none', borderRadius:10, padding:'8px 18px', color:'#fff', fontFamily:FN, fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 14px rgba(254,80,0,.35)', whiteSpace:'nowrap' }}>
          Crear mi negocio gratis →
        </button>
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ display:'flex', maxWidth:1100, margin:'0 auto' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${C.rim}`, minHeight:'calc(100vh - 48px)', display:'flex', flexDirection:'column', padding:'16px 0', position:'sticky', top:48, height:'calc(100vh - 48px)', overflowY:'auto' }}>

          {/* Comercio header */}
          <div style={{ padding:'0 16px 16px', borderBottom:`1px solid ${C.rim}`, marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.accent},#a78bfa)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>☕</div>
              <div>
                <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{DEMO_COMMERCE.name}</div>
                <div style={{ fontSize:10, color:C.mist }}>{DEMO_COMMERCE.category}</div>
              </div>
            </div>
          </div>

          {MENU.map(m => (
            <button key={m.id} onClick={() => { setTab(m.id); setAutoDetail(null) }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', background:tab===m.id?`${C.v}20`:'transparent', border:'none', borderLeft:`3px solid ${tab===m.id?C.v:'transparent'}`, color:tab===m.id?C.white:C.mist, fontSize:12, cursor:'pointer', textAlign:'left', width:'100%', transition:'all .15s', fontFamily:'inherit', position:'relative' }}>
              <span style={{ fontSize:15 }}>{m.icon}</span>
              <span style={{ fontFamily:FN, fontWeight:tab===m.id?700:400, flex:1 }}>{m.label}</span>
              {m.id==='automatizaciones' && totalDetected>0 && (
                <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:C.accent, borderRadius:99, padding:'1px 6px' }}>{totalDetected}</span>
              )}
            </button>
          ))}

          {/* Plan badge */}
          <div style={{ margin:'auto 12px 12px', padding:'10px 12px', background:'#2A1E00', border:`1px solid ${C.o}44`, borderRadius:10, marginTop:'auto' }}>
            <div style={{ fontFamily:FN, fontSize:10, fontWeight:700, color:C.o, letterSpacing:'.08em', marginBottom:2 }}>PRO</div>
            <div style={{ fontSize:10, color:C.mist }}>Todas las funciones activas</div>
          </div>
        </div>

        {/* ── CONTENIDO ── */}
        <div style={{ flex:1, padding:'28px 28px 80px', overflowY:'auto', maxWidth:700 }}>

          {/* DASHBOARD */}
          {tab==='dashboard' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:4 }}>¡Hola, {DEMO_COMMERCE.name}! 👋</div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:24 }}>Esto es tu panel de control.</div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {[
                  { icon:'📅', label:'Visitas este mes', val:'47', color:C.accent },
                  { icon:'👥', label:'Activos esta semana', val:'8', color:C.ok },
                  { icon:'🎁', label:'Canjes este mes', val:'5', color:C.o },
                ].map(s => (
                  <PCard key={s.label} style={{ padding:'14px', textAlign:'center' }}>
                    <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
                    <div style={{ fontFamily:FN, fontSize:26, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:10, color:C.mist, marginTop:4 }}>{s.label}</div>
                  </PCard>
                ))}
              </div>

              <PCard style={{ padding:'16px 18px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.mist, fontWeight:700, marginBottom:12 }}>Actividad reciente</div>
                {DEMO_ACTIVITY.slice(0,5).map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.rim}` }}>
                    <span style={{ fontSize:14 }}>{a.type==='scan'?'📍':a.type==='prize_redeemed'?'🎁':'⚙️'}</span>
                    <div style={{ flex:1, fontSize:12, color:C.mist }}>{a.description}</div>
                    <div style={{ fontSize:10, color:C.dust }}>{new Date(a.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                  </div>
                ))}
              </PCard>

              <PCard style={{ padding:'14px 16px', border:`1px solid ${C.accent}33` }}>
                <div style={{ fontFamily:FN, fontSize:12, fontWeight:700, color:C.white, marginBottom:8 }}>🤖 Automatizaciones activas</div>
                <div style={{ fontSize:12, color:C.mist }}>
                  <span style={{ color:C.accent, fontWeight:700 }}>{totalDetected} clientes</span> detectados para contactar hoy.{' '}
                  <button onClick={() => setTab('automatizaciones')} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:12, fontFamily:FI, padding:0, textDecoration:'underline' }}>Ver automatizaciones →</button>
                </div>
              </PCard>
            </div>
          )}

          {/* CLIENTES */}
          {tab==='clientes' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:4 }}>Clientes</div>
              <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>{members.length} clientes registrados</div>
              {members.map(m => {
                const days = Math.floor((Date.now() - new Date(m.last_visit).getTime()) / 86400000)
                return (
                  <PCard key={m.id} style={{ padding:'12px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                    <Avatar name={m.profiles.full_name} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{m.profiles.full_name}</div>
                      <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>{m.visits_count} visitas · última hace {days === 0 ? 'hoy' : `${days}d`}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:FN, fontSize:16, fontWeight:700, color:C.accent }}>{m.points} 💎</div>
                      {cheapest && m.points >= cheapest.cost && (
                        <div style={{ fontSize:9, color:C.ok, fontWeight:700 }}>¡Puede canjear!</div>
                      )}
                    </div>
                  </PCard>
                )
              })}
            </div>
          )}

          {/* PREMIOS */}
          {tab==='premios' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:20 }}>Premios</div>
              {prizes.map(p => (
                <PCard key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', marginBottom:8 }}>
                  <div style={{ width:48, height:48, borderRadius:10, background:C.bg3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🎁</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{p.name}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:3 }}>
                      <span style={{ fontSize:11, color:C.accent }}>💎 {p.cost} puntos</span>
                      {p.stock !== null && (
                        <span style={{ fontSize:10, color:p.stock<=3?C.warn:C.dust, background:`${p.stock<=3?C.warn:C.rim}18`, borderRadius:6, padding:'1px 6px', border:`1px solid ${p.stock<=3?C.warn+'44':C.rim}` }}>Stock: {p.stock}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setPrizes(ps => ps.map(x => x.id===p.id ? {...x, active:!x.active} : x))}
                    style={{ background:p.active?`${C.ok}22`:C.bg3, border:`1px solid ${p.active?C.ok:C.rim}`, color:p.active?C.ok:C.dust, borderRadius:8, padding:'5px 10px', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FN }}>
                    {p.active ? '● Activo' : '○ Inactivo'}
                  </button>
                </PCard>
              ))}
              <PCard style={{ padding:16, marginTop:12, border:`1px dashed ${C.rim}`, opacity:.6 }}>
                <div style={{ fontSize:12, color:C.mist, textAlign:'center' }}>+ Crear nuevo premio (disponible en tu panel real)</div>
              </PCard>
            </div>
          )}

          {/* PROMOCIONES */}
          {tab==='promociones' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:20 }}>Promociones</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  { icon:'🏷️', label:'Descuento en visita', desc:'% de descuento automático al escanear QR', color:'#F59E0B' },
                  { icon:'🔥', label:'Doble puntos',         desc:'Multiplicá los puntos por día o período',  color:'#6366F1' },
                ].map((t,i) => (
                  <PCard key={i} style={{ padding:'16px 14px', border:`1px solid ${t.color}33`, cursor:'pointer' }} onClick={fakeSave}>
                    <div style={{ fontSize:26, marginBottom:8 }}>{t.icon}</div>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white, marginBottom:4 }}>{t.label}</div>
                    <div style={{ fontSize:11, color:C.mist, lineHeight:1.5 }}>{t.desc}</div>
                  </PCard>
                ))}
              </div>

              <div style={{ fontSize:11, color:C.mist, fontWeight:700, marginBottom:10, textTransform:'uppercase', letterSpacing:'.08em' }}>Activas ahora</div>
              {promos.map(p => (
                <PCard key={p.id} style={{ padding:'14px 16px', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${C.o}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏷️</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{p.description}</div>
                      <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                        Vence {new Date(p.expires_at).toLocaleDateString('es-AR',{day:'numeric',month:'short'})} · {members.length} clientes notificados
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:C.ok }} />
                      <span style={{ fontSize:10, color:C.ok, fontFamily:FN, fontWeight:700 }}>Activa</span>
                    </div>
                  </div>
                </PCard>
              ))}
            </div>
          )}

          {/* AUTOMATIZACIONES */}
          {tab==='automatizaciones' && (() => {
            if (autoDetail) {
              const meta    = AUTO_META[autoDetail]
              const clients = autoClients[autoDetail]
              return (
                <div>
                  <button onClick={() => setAutoDetail(null)}
                    style={{ background:'transparent', border:'none', color:C.mist, cursor:'pointer', fontSize:12, fontFamily:FN, padding:0, marginBottom:16 }}>
                    ← Volver
                  </button>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:22 }}>{meta.icon}</span>
                    <div style={{ fontFamily:FN, fontSize:20, fontWeight:900, color:C.white }}>{meta.label}</div>
                  </div>
                  <div style={{ fontSize:12, color:C.mist, marginBottom:20 }}>
                    {clients.length} cliente{clients.length!==1?'s':''} detectado{clients.length!==1?'s':''}
                  </div>
                  {clients.length===0 && (
                    <PCard style={{ padding:28, textAlign:'center' }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                      <div style={{ fontSize:13, color:C.mist }}>Sin clientes en esta condición ahora.</div>
                    </PCard>
                  )}
                  {clients.map(m => {
                    const msg = buildMsg(autoDetail, m)
                    return (
                      <PCard key={m.id} style={{ padding:'14px 16px', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                          <Avatar name={m.profiles.full_name} size={36} />
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{m.profiles.full_name}</div>
                            <div style={{ fontSize:11, color:C.mist }}>
                              {autoDetail==='reactivacion' && `Última visita: hace ${Math.floor((Date.now()-new Date(m.last_visit).getTime())/86400000)} días`}
                              {autoDetail==='cercaPremio'  && `${m.points} / ${cheapest?.cost} 💎 · falta ${cheapest?.cost - m.points}`}
                              {autoDetail==='primeraVisita'&& `Primera visita registrada`}
                            </div>
                          </div>
                        </div>
                        <div style={{ background:C.bg, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 12px', marginBottom:10, fontSize:12, color:C.mist, lineHeight:1.65, whiteSpace:'pre-line', fontFamily:FI }}>
                          {msg}
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => navigator.clipboard?.writeText(msg)}
                            style={{ flex:1, padding:'8px', background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:9, color:C.mist, fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            📋 Copiar mensaje
                          </button>
                          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                            style={{ flex:1, padding:'8px', background:'#25D36618', border:'1px solid #25D36644', borderRadius:9, color:'#25D366', fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer', textDecoration:'none', textAlign:'center' }}>
                            💬 WhatsApp
                          </a>
                        </div>
                      </PCard>
                    )
                  })}
                </div>
              )
            }
            return (
              <div>
                <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:4 }}>Automatizaciones</div>
                <div style={{ fontSize:13, color:C.mist, marginBottom:20 }}>Detectamos oportunidades de venta para que actúes con un click.</div>
                {Object.entries(AUTO_META).map(([key, meta]) => {
                  const count = autoClients[key].length
                  return (
                    <PCard key={key} style={{ padding:'16px 18px', marginBottom:12, border:`1px solid ${count>0?meta.color+'44':C.rim}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <span style={{ fontSize:22 }}>{meta.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:FN, fontSize:14, fontWeight:700, color:C.white }}>{meta.label}</div>
                          <div style={{ fontSize:11, color:C.mist, marginTop:2 }}>
                            {key==='reactivacion'  && 'Sin visitar hace más de 7 días'}
                            {key==='cercaPremio'   && (cheapest?`≥80% hacia "${cheapest.name}"` : 'Sin premios activos')}
                            {key==='primeraVisita' && 'Primera visita en los últimos 7 días'}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontFamily:FN, fontSize:24, fontWeight:900, color: count>0?meta.color:C.dust }}>{count}</div>
                          <div style={{ fontSize:9, color:C.dust }}>detectados</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        {count>0
                          ? <button onClick={() => setAutoDetail(key)}
                              style={{ padding:'7px 14px', background:`${meta.color}22`, border:`1px solid ${meta.color}55`, borderRadius:9, color:meta.color, fontFamily:FN, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                              Ver clientes →
                            </button>
                          : <span style={{ fontSize:11, color:C.dust }}>Sin clientes en esta condición</span>
                        }
                      </div>
                    </PCard>
                  )
                })}
              </div>
            )
          })()}

          {/* HISTORIAL */}
          {tab==='historial' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:20 }}>Historial de actividad</div>
              {DEMO_ACTIVITY.map(a => (
                <PCard key={a.id} style={{ padding:'12px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:18 }}>{a.type==='scan'?'📍':a.type==='prize_redeemed'?'🎁':'⚙️'}</span>
                  <div style={{ flex:1, fontSize:12, color:C.mist }}>{a.description}</div>
                  <div style={{ fontSize:10, color:C.dust, flexShrink:0 }}>
                    {new Date(a.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}
                  </div>
                </PCard>
              ))}
            </div>
          )}

          {/* CONFIGURACIÓN */}
          {tab==='configuracion' && (
            <div>
              <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:6 }}>Configuración</div>
              <div style={{ fontSize:12, color:C.mist, marginBottom:24 }}>Completá tu perfil para aparecer en el directorio.</div>

              {[
                {
                  icon:'🏪', title:'Información básica',
                  fields:[
                    { label:'Nombre del negocio', value:DEMO_COMMERCE.name, required:true },
                    { label:'Categoría', value:DEMO_COMMERCE.category, required:true },
                    { label:'Descripción', value:DEMO_COMMERCE.description, optional:true, textarea:true },
                  ]
                },
                {
                  icon:'📞', title:'Contacto',
                  fields:[
                    { label:'Teléfono / WhatsApp', value:DEMO_COMMERCE.phone, optional:true, hint:'💡 Se usará en automatizaciones' },
                    { label:'Instagram', value:DEMO_COMMERCE.instagram, optional:true },
                    { label:'Facebook', value:DEMO_COMMERCE.facebook, optional:true },
                  ]
                },
                {
                  icon:'📍', title:'Ubicación y horarios',
                  fields:[
                    { label:'Dirección', value:DEMO_COMMERCE.address, optional:true },
                    { label:'Horarios de atención', value:DEMO_COMMERCE.hours, optional:true },
                  ]
                },
              ].map((section, si) => (
                <PCard key={si} style={{ padding:'18px 20px', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <span style={{ fontSize:15 }}>{section.icon}</span>
                    <div style={{ fontFamily:FN, fontSize:13, fontWeight:700, color:C.white }}>{section.title}</div>
                    <div style={{ flex:1, height:1, background:C.rim, marginLeft:4 }} />
                  </div>
                  {section.fields.map((f, fi) => (
                    <div key={fi} style={{ marginBottom:fi < section.fields.length-1 ? 14 : 0 }}>
                      <div style={{ fontSize:11, color:C.mist, fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                        {f.label}
                        {f.required && <span style={{ color:'#f87171', fontSize:10 }}>*</span>}
                        {f.optional && <span style={{ color:C.dust, fontWeight:400, fontSize:10 }}>(opcional)</span>}
                      </div>
                      {f.textarea
                        ? <textarea defaultValue={f.value} rows={3}
                            style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl, width:'100%', resize:'vertical', fontFamily:FI, boxSizing:'border-box' }} />
                        : <input defaultValue={f.value}
                            style={{ background:C.bg3, border:`1px solid ${C.rim}`, borderRadius:10, padding:'10px 13px', fontSize:13, color:C.pearl, width:'100%', fontFamily:FI, boxSizing:'border-box' }} />
                      }
                      {f.hint && <div style={{ fontSize:10, color:C.dust, marginTop:4 }}>{f.hint}</div>}
                    </div>
                  ))}
                </PCard>
              ))}

              <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10, marginTop:14 }}>
                {saved && <span style={{ fontSize:12, color:C.ok }}>✓ Guardado</span>}
                <GBtn onClick={fakeSave}>{saved ? '✓ Guardado' : 'Guardar cambios'}</GBtn>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL CTA ── */}
      {showCTA && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowCTA(false)}>
          <div style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)', border:`1px solid ${C.rim}`, borderRadius:20, padding:'32px 28px', maxWidth:380, width:'100%', textAlign:'center', boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:44, marginBottom:16 }}>🚀</div>
            <div style={{ fontFamily:FN, fontSize:22, fontWeight:900, color:C.white, marginBottom:8 }}>Creá tu negocio gratis</div>
            <div style={{ fontSize:13, color:C.mist, lineHeight:1.7, marginBottom:24 }}>
              En 5 minutos tenés tu sistema de fidelización funcionando. Tus clientes ya pueden empezar a acumular.
            </div>
            {[
              '✓ Gratis para empezar (plan FREE)',
              '✓ Sin tarjeta de crédito',
              '✓ Escáner QR desde el celular',
              '✓ Hasta 30 clientes en el plan gratis',
            ].map(b => (
              <div key={b} style={{ fontSize:12, color:C.mist, textAlign:'left', marginBottom:6 }}>{b}</div>
            ))}
            <a href="/"
              style={{ display:'block', marginTop:20, padding:'14px', background:G, border:'none', borderRadius:12, color:'#fff', fontFamily:FN, fontSize:15, fontWeight:700, cursor:'pointer', textDecoration:'none', boxShadow:'0 4px 20px rgba(254,80,0,.35)' }}>
              Empezar ahora →
            </a>
            <button onClick={() => setShowCTA(false)}
              style={{ marginTop:12, background:'transparent', border:'none', color:C.dust, fontSize:12, cursor:'pointer', fontFamily:FI }}>
              Seguir explorando el demo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
