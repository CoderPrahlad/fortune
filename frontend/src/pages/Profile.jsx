import { useState, useEffect } from 'react';
import { useAuth, getDefaultAvatar } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import AvatarPicker from '../components/AvatarPicker';
import api from '../api/axios';
import './Profile.css';

export default function Profile() {
  const { user, siteSettings, loginOK, logout } = useAuth();
  const { showToast, showModal } = useUI();
  const [open, setOpen] = useState(null);
  const [avShow, setAvShow] = useState(false);
  const [nUser, setNUser] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [cfmPass, setCfmPass] = useState('');
  const [stats, setStats] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const d = await api.get('/auth/profile');
    if (!d?.success) return;
    setNUser(d.user.username); setNEmail(d.user.email);
    setStats({ wins: d.user.total_wins||0, bets: d.user.total_bets||0, coins: d.user.coins||0 });
  };

  const toggle = (k) => setOpen(o => o===k?null:k);

  const updateProfile = async () => {
    const d = await api.put('/auth/profile', { username: nUser, email: nEmail });
    if (!d?.success) { showToast('❌ '+(d?.message||'Error'), 'lose'); return; }
    await loginOK(d.user);
    showToast('✅ Profile updated!', 'win');
  };

  const changePass = async () => {
    if (!curPass||!newPass||!cfmPass) { showToast('⚠️ Fill all!', 'lose'); return; }
    if (newPass !== cfmPass) { showToast('❌ Passwords mismatch!', 'lose'); return; }
    const d = await api.put('/auth/change-password', { current_password: curPass, new_password: newPass });
    if (!d?.success) { showToast('❌ '+(d?.message||'Error'), 'lose'); return; }
    setCurPass(''); setNewPass(''); setCfmPass('');
    showModal('🔐','PASSWORD CHANGED!','Your password is updated!','');
  };

  const openTg = () => {
    if (!siteSettings.telegram_link) { showToast('📱 Support link not set', 'lose'); return; }
    window.open(siteSettings.telegram_link, '_blank');
  };

  const av = user?.avatar || getDefaultAvatar(user?.username||'');

  return (
    <div className="page-scroll">
      <AvatarPicker show={avShow} onClose={() => setAvShow(false)} />

      {/* Hero */}
      <div className="profile-hero">
        <div className="p-av" onClick={() => setAvShow(true)}>
          {av}
          <div className="p-av-edit">✏️ EDIT</div>
        </div>
        <div style={{fontFamily:'Orbitron',fontSize:16,fontWeight:900,color:'#fff',marginBottom:4}}>{user?.username}</div>
        <div style={{fontSize:11,color:'#aaa',marginBottom:12}}>{user?.email}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <div className="p-stat"><div className="p-stat-v">{stats.wins||0}</div><div className="p-stat-l">WINS</div></div>
          <div className="p-stat"><div className="p-stat-v" style={{color:'var(--gold)'}}>🪙{parseInt(stats.coins||0).toLocaleString()}</div><div className="p-stat-l">COINS</div></div>
          <div className="p-stat"><div className="p-stat-v">{stats.bets||0}</div><div className="p-stat-l">BETS</div></div>
        </div>
      </div>

      {/* Accordion Menu */}
      <div className="prof-menu">
        {/* Edit Profile */}
        <div className={'prof-menu-item'+(open==='edit'?' open':'')} id="pm-edit">
          <div className="prof-menu-hdr" onClick={() => toggle('edit')}>
            <div className="prof-menu-left">
              <div className="prof-menu-icon gold">✏️</div>
              <div><div className="prof-menu-title">EDIT PROFILE</div><div className="prof-menu-sub">Username, Email, Avatar</div></div>
            </div>
            <div className="prof-menu-arrow">▼</div>
          </div>
          <div className="prof-menu-body">
            <div className="fg"><label>USERNAME</label><input value={nUser} onChange={e=>setNUser(e.target.value)} /></div>
            <div className="fg"><label>EMAIL</label><input value={nEmail} onChange={e=>setNEmail(e.target.value)} /></div>
            <button className="btn-gold" style={{marginTop:4}} onClick={updateProfile}>SAVE CHANGES</button>
          </div>
        </div>

        {/* Change Password */}
        <div className={'prof-menu-item'+(open==='pass'?' open':'')}>
          <div className="prof-menu-hdr" onClick={() => toggle('pass')}>
            <div className="prof-menu-left">
              <div className="prof-menu-icon red">🔐</div>
              <div><div className="prof-menu-title">CHANGE PASSWORD</div><div className="prof-menu-sub">Update your password</div></div>
            </div>
            <div className="prof-menu-arrow">▼</div>
          </div>
          <div className="prof-menu-body">
            <div className="fg"><label>CURRENT PASSWORD</label><input type="password" value={curPass} onChange={e=>setCurPass(e.target.value)} /></div>
            <div className="fg"><label>NEW PASSWORD</label><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} /></div>
            <div className="fg"><label>CONFIRM PASSWORD</label><input type="password" value={cfmPass} onChange={e=>setCfmPass(e.target.value)} /></div>
            <button className="btn-gold" style={{marginTop:4}} onClick={changePass}>CHANGE PASSWORD</button>
          </div>
        </div>

        {/* Support */}
        <div className={'prof-menu-item'+(open==='sup'?' open':'')}>
          <div className="prof-menu-hdr" onClick={() => toggle('sup')}>
            <div className="prof-menu-left">
              <div className="prof-menu-icon blue">📱</div>
              <div><div className="prof-menu-title">CUSTOMER SUPPORT</div><div className="prof-menu-sub">Contact us on Telegram</div></div>
            </div>
            <div className="prof-menu-arrow">▼</div>
          </div>
          <div className="prof-menu-body">
            <p style={{fontSize:12,color:'#ccc',marginBottom:12,lineHeight:1.6}}>Kisi bhi problem ke liye Telegram pe contact karo. 24/7 support available.</p>
            <button className="btn-gold" onClick={openTg}>📱 OPEN TELEGRAM</button>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button onClick={logout} style={{width:'100%',padding:12,background:'rgba(255,34,68,.1)',border:'1.5px solid rgba(255,34,68,.3)',borderRadius:12,color:'var(--red)',fontFamily:'Orbitron',fontSize:11,fontWeight:700,cursor:'pointer',marginBottom:14}}>
        🚪 LOGOUT
      </button>

      {/* Footer */}
      <div className="prof-footer">
        <div className="prof-footer-logo">🎰</div>
        <div className="prof-footer-name">Lucky Fortune Casino</div>
        <div className="prof-footer-dev">Developed by Lucky Fortune · 2025</div>
      </div>
    </div>
  );
}
