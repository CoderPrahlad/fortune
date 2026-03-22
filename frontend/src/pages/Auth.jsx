import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';
import './Auth.css';

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [loaderShow, setLoaderShow] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState('');
  const { loginOK } = useAuth();
  const { showToast } = useUI();

  // Login fields
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');

  // Register fields
  const [rUser, setRUser] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [rCode, setRCode] = useState('');

  // Check URL for ref code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) { setRCode(ref); setTab('register'); }
  }, []);

  const showLoader = (msg) => { setLoaderMsg(msg); setLoaderShow(true); };
  const hideLoader = (cb) => { setTimeout(() => { setLoaderShow(false); if (cb) cb(); }, 500); };

  const doLogin = async () => {
    if (!lUser || !lPass) { showToast('⚠️ Fill all fields!', 'lose'); return; }
    showLoader('LOGGING IN...');
    const d = await api.post('/auth/login', { username: lUser, password: lPass });
    if (!d?.success) { hideLoader(); showToast('❌ ' + (d?.message || 'Failed'), 'lose'); return; }
    localStorage.setItem('lf_tok', d.token);
    setTimeout(() => hideLoader(() => loginOK(d.user)), 800);
  };

  const doRegister = async () => {
    if (!rUser || !rEmail || !rPass) { showToast('⚠️ Fill all fields!', 'lose'); return; }
    showLoader('CREATING ACCOUNT...');
    const d = await api.post('/auth/register', { username: rUser, email: rEmail, password: rPass, refer_code: rCode || null });
    if (!d?.success) { hideLoader(); showToast('❌ ' + (d?.errors?.[0]?.msg || d?.message || 'Failed'), 'lose'); return; }
    localStorage.setItem('lf_tok', d.token);
    setTimeout(() => hideLoader(() => loginOK(d.user)), 800);
  };

  return (
    <div className="auth-screen">
      {/* Login Loader */}
      {loaderShow && (
        <div className="login-loader">
          <span style={{ fontSize: 64, animation: 'coinSpin 1.5s ease-in-out infinite' }}>🪙</span>
          <div style={{ fontFamily: 'Orbitron', color: 'var(--gold)', marginTop: 16, letterSpacing: 4, fontSize: 13 }}>{loaderMsg}</div>
          <div className="ll-bar"><div className="ll-bar-fill"></div></div>
        </div>
      )}

      <span style={{ fontSize: 64, display: 'block', animation: 'coinSpin 3s ease-in-out infinite', filter: 'drop-shadow(0 0 22px rgba(255,215,0,.7))', marginBottom: 8 }}>🪙</span>
      <div className="logo-title">Lucky Fortune</div>
      <div className="logo-sub">✦ PREMIUM CASINO ✦</div>

      <div className="auth-box">
        <div className="auth-tabs">
          <div className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>LOGIN</div>
          <div className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>REGISTER</div>
        </div>

        {tab === 'login' && (
          <div>
            <div className="fg"><label>USERNAME</label><input value={lUser} onChange={e => setLUser(e.target.value)} placeholder="Enter username" /></div>
            <div className="fg"><label>PASSWORD</label><input type="password" value={lPass} onChange={e => setLPass(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            <button className="btn-gold" onClick={doLogin}>🎰 LOGIN</button>
          </div>
        )}

        {tab === 'register' && (
          <div>
            <div className="fg"><label>USERNAME</label><input value={rUser} onChange={e => setRUser(e.target.value)} placeholder="Choose username" /></div>
            <div className="fg"><label>EMAIL</label><input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="Your email" /></div>
            <div className="fg"><label>PASSWORD</label><input type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Create password" /></div>
            <input className="refer-inp" value={rCode} onChange={e => setRCode(e.target.value)} placeholder="🎁 Refer code (optional)" />
            <button className="btn-gold" onClick={doRegister}>🚀 CREATE ACCOUNT</button>
          </div>
        )}
      </div>
    </div>
  );
}
