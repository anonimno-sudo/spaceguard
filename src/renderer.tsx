import * as React from 'react'
const { useEffect, useState } = React
// Lightweight tauri invoke shim for dev environment (avoids TS module resolution issues)
declare global { interface Window { __TAURI__?: any } }
const invoke = async (cmd: string, args?: any) => {
  if ((window as any).__TAURI__ && (window as any).__TAURI__.invoke) {
    return (window as any).__TAURI__.invoke(cmd, args)
  }
  return Promise.resolve(null)
}

type AuthState = {
  loggedIn: boolean;
  edition?: string;
  accessToken?: string;
}

type Feature = {
  id: string;
  title: string;
  desc: string;
  minEdition: 'Standard' | 'Pro' | 'Sovereign';
}

const FEATURES: Feature[] = [
  { id: 'quick', title: 'Quick Scan', desc: 'Hızlı tarama: Downloads, Desktop, Temp', minEdition: 'Standard' },
  { id: 'full', title: 'Full Scan', desc: 'Sürücü bazlı tam tarama', minEdition: 'Pro' },
  { id: 'web', title: 'Web Protection', desc: 'Tehlikeli site uyarıları (extension)', minEdition: 'Pro' },
  { id: 'quarantine', title: 'Quarantine', desc: 'Karantina yönetimi', minEdition: 'Standard' },
  { id: 'forensics', title: 'Advanced Forensics', desc: 'Detaylı olay inceleme (Sovereign)', minEdition: 'Sovereign' },
]

function editionRank(ed?: string) {
  if (!ed) return 0;
  switch (ed) {
    case 'Standard': return 1;
    case 'Pro': return 2;
    case 'Sovereign': return 3;
    default: return 0;
  }
}

function isAvailable(edition: string | undefined, feature: Feature) {
  return editionRank(edition) >= editionRank(feature.minEdition);
}

function Header({ auth, onSignIn, onLogout }: { auth: AuthState, onSignIn: ()=>void, onLogout: ()=>void }){
  return (
    <header className="header">
      <div className="brand">
        <h1>SPACEGuard</h1>
        <div className="tag">NextGen Endpoint Protection</div>
      </div>
      <div className="actions">
        <div className="edition-badge">{auth.loggedIn ? (auth.edition || 'Standard') : 'Not signed in'}</div>
        <div style={{marginLeft:12}}>
          {auth.loggedIn ? <button onClick={onLogout}>Logout</button> : <button onClick={onSignIn}>Sign in</button>}
        </div>
      </div>
    </header>
  )
}

export default function App(){
  const [status, setStatus] = useState('Idle')
  const [detections, setDetections] = useState<any[]>([])
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false })
  const [showUpgradeFor, setShowUpgradeFor] = useState<Feature | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('sg_access')
        const edition = localStorage.getItem('sg_edition') || undefined
        if (token) {
          setAuth({ loggedIn: true, accessToken: token, edition: edition })
        }
      } catch(e){}
    })()
  }, [])

  async function runQuick(){
    setStatus('Scanning...')
    try{
      await invoke('quick_scan')
    }catch(e){ console.error(e) }
    setStatus('Idle')
  }

  async function runFeature(feature: Feature){
    if (!isAvailable(auth.edition, feature)){
      setShowUpgradeFor(feature)
      return
    }
    // map feature to action
    if (feature.id === 'quick') return runQuick()
    if (feature.id === 'quarantine') alert('Open Quarantine (demo)')
    if (feature.id === 'full') alert('Start Full Scan (demo)')
    if (feature.id === 'web') alert('Open Web Protection settings (demo)')
    if (feature.id === 'forensics') alert('Open Forensics (demo)')
  }

  async function openLogin(){
    const email = prompt('Email')
    const pw = prompt('Password')
    if (!email || !pw) return
    setStatus('Signing in...')
    try{
      const r = await fetch('http://127.0.0.1:4000/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pw, remember: true }) })
      if (r.ok){
        const j = await r.json()
        setAuth({ loggedIn: true, edition: j.edition, accessToken: j.access_token })
        localStorage.setItem('sg_access', j.access_token)
        localStorage.setItem('sg_edition', j.edition)
      } else {
        const text = await r.text()
        alert('Giriş başarısız: ' + text)
      }
    }catch(e){ alert('Sunucuya bağlanılamıyor') }
    setStatus('Idle')
  }

  function logout(){
    setAuth({ loggedIn: false })
    localStorage.removeItem('sg_access')
    localStorage.removeItem('sg_edition')
  }

  async function upgradeTo(plan: 'Pro'|'Sovereign'){
    if (!auth.accessToken) { alert('Lütfen giriş yapın'); return }
    const body = { access_token: auth.accessToken, plan }
    try{
      const r = await fetch('http://127.0.0.1:4000/upgrade_plan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (r.ok){
        const j = await r.json()
        setAuth(s => ({ ...s, edition: j.edition }))
        localStorage.setItem('sg_edition', j.edition)
        alert('Upgrade başarılı: ' + j.edition)
        setShowUpgradeFor(null)
      } else {
        const t = await r.text(); alert('Upgrade failed: '+t)
      }
    }catch(e){ alert('Sunucu hatası') }
  }

  async function openRegister(){
    const email = prompt('Email for registration')
    const pw = prompt('Password (min 8)')
    const name = prompt('Display name (optional)')
    if (!email || !pw) return
    try{
      const r = await fetch('http://127.0.0.1:4000/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pw, display_name: name }) })
      if (r.ok){
        const j = await r.json()
        alert('Registered. Verification token (demo): ' + (j.verification_token || ''))
      } else { const t = await r.text(); alert('Register failed: '+t) }
    }catch(e){ alert('Sunucu hatası') }
  }

  async function requestPasswordReset(){
    const email = prompt('Email for password reset')
    if (!email) return
    try{
      const r = await fetch('http://127.0.0.1:4000/request_password_reset', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email }) })
      if (r.ok){
        const j = await r.json()
        if (j.token) alert('Password reset token (demo): user_id=' + j.user_id + ' token=' + j.token)
        else alert('If account exists, a reset token was generated (demo)')
      } else { const t = await r.text(); alert('Request failed: '+t) }
    }catch(e){ alert('Sunucu hatası') }
  }

  async function resetPassword(){
    const user_id = Number(prompt('User ID'))
    const token = prompt('Reset token')
    const newpw = prompt('New password')
    if (!user_id || !token || !newpw) return
    try{
      const r = await fetch('http://127.0.0.1:4000/reset_password', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ user_id, token, new_password: newpw }) })
      if (r.ok) alert('Password reset OK')
      else { const t = await r.text(); alert('Reset failed: '+t) }
    }catch(e){ alert('Sunucu hatası') }
  }

  async function verifyEmailUI(){
    const user_id = Number(prompt('User ID'))
    const token = prompt('Verification token')
    if (!user_id || !token) return
    try{
      const r = await fetch('http://127.0.0.1:4000/verify_email', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ user_id, token }) })
      if (r.ok) alert('Email verified')
      else { const t = await r.text(); alert('Verify failed: '+t) }
    }catch(e){ alert('Sunucu hatası') }
  }

  return (
    <div className="app layout">
      <Header auth={auth} onSignIn={openLogin} onLogout={logout} />
      <div style={{position:'absolute', top:14, right:220, display:'flex', gap:8}}>
        <button onClick={openRegister}>Register</button>
        <button onClick={() => { requestPasswordReset(); }}>Forgot</button>
        <button onClick={() => { verifyEmailUI(); }}>Verify</button>
      </div>
      <div className="main-area">
        <aside className="sidebar">
          <div className="profile">
            <div className="avatar">SG</div>
            <div className="info">
              <div className="name">{auth.loggedIn ? 'User' : 'Guest'}</div>
              <div className="editionSmall">{auth.edition || 'Standard'}</div>
            </div>
          </div>
          <nav>
            <button className="nav-btn">Dashboard</button>
            <button className="nav-btn">Scan</button>
            <button className="nav-btn">Quarantine</button>
            <button className="nav-btn">History</button>
            <button className="nav-btn">Settings</button>
          </nav>
        </aside>
        <section className="content">
          <div className="hero">
            <div className="status-card">
              <div className="status-title">Protection</div>
              <div className="status-state">Protected</div>
              <div className="status-meta">Last scan: -- | Definitions: up-to-date</div>
            </div>
            <div className="actions-card">
              <button className="primary" onClick={()=>runFeature(FEATURES[0])}>Quick Scan</button>
              <button onClick={()=>runFeature(FEATURES[1])}>Full Scan</button>
              <button onClick={()=>runFeature(FEATURES[2])}>Web Protection</button>
            </div>
          </div>

          <div className="features">
            {FEATURES.map(f => (
              <div key={f.id} className={"feature-card " + (isAvailable(auth.edition, f) ? 'unlocked':'locked')} onClick={()=>runFeature(f)}>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
                {!isAvailable(auth.edition, f) && <div className="lock">🔒 Upgrade</div>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {showUpgradeFor && (
        <div className="modal">
          <div className="modal-card">
            <h3>Upgrade to access: {showUpgradeFor.title}</h3>
            <p>Choose a plan to unlock this feature.</p>
            <div className="modal-actions">
              <button onClick={()=>upgradeTo('Pro')}>Upgrade to Pro</button>
              <button onClick={()=>upgradeTo('Sovereign')}>Upgrade to Sovereign</button>
              <button onClick={()=>setShowUpgradeFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
