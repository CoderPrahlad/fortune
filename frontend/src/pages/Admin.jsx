import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';
import './Admin.css';

const GAME_NAMES = { aviator:'✈️ Aviator', slots:'🎰 Slots', wingo:'🎨 Wingo', cards:'🃏 Cards', jackpot:'💎 Jackpot' };
const COLOR_MAP = {0:'violet',1:'green',2:'red',3:'green',4:'red',5:'violet',6:'red',7:'green',8:'red',9:'green'};

export default function Admin() {
  const navigate = useNavigate();
  const { user, gameSettings, setGameSettings, siteSettings, setSiteSettings, refreshSettings, logout } = useAuth();
  const { showToast } = useUI();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [deps, setDeps] = useState([]);
  const [upi, setUpi] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [tgLink, setTgLink] = useState('');
  const [localGs, setLocalGs] = useState({});
  const [wingoPeriod, setWingoPeriod] = useState('');
  const [overrideNum, setOverrideNum] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [payTab, setPayTab] = useState('all');

  useEffect(() => { if (!user?.is_admin) { navigate('/'); return; } loadAll(); }, []);

  const loadAll = async () => {
    const [s, ps, gs, u, d, w] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/payment-settings'),
      api.get('/admin/game-settings'),
      api.get('/admin/users'),
      api.get('/admin/deposits'),
      api.get('/admin/wingo/current'),
    ]);
    if (s?.success) setStats(s.stats);
    if (ps?.success) { setUpi(ps.settings.upi_id||''); setSiteUrl(ps.settings.site_url||''); setTgLink(ps.settings.telegram_link||''); }
    if (gs?.success) { setLocalGs(gs.settings); setGameSettings(gs.settings); }
    if (u?.success) setUsers(u.users||[]);
    if (d?.success) setDeps(d.deposits||[]);
    if (w?.success) { setWingoPeriod(w.period); setOverrideStatus(w.admin_override); setOverrideNum(w.admin_override??null); }
  };

  const savePaySettings = async () => {
    if (!upi) { showToast('⚠️ UPI ID required!', 'lose'); return; }
    const d = await api.post('/admin/payment-settings', { upi_id:upi, site_url:siteUrl, telegram_link:tgLink });
    if (!d?.success) { showToast('❌ '+(d?.message||'Error'), 'lose'); return; }
    setSiteSettings({ upi_id:upi, site_url:siteUrl, telegram_link:tgLink });
    showToast('✅ Settings saved!', 'win');
  };

  const toggleGame = async (g) => {
    const cur = localGs[g] !== false;
    const newState = !cur;
    setLocalGs(p => ({...p, [g]:newState}));
    const d = await api.post('/admin/game-settings', { game_name:g, is_enabled:newState });
    if (!d?.success) { setLocalGs(p => ({...p,[g]:cur})); showToast('❌ Failed','lose'); return; }
    setGameSettings(p => ({...p,[g]:newState}));
    showToast(`${newState?'✅':'🚫'} ${GAME_NAMES[g]} ${newState?'enabled':'disabled'}`, newState?'win':'lose');
  };

  const addCoins = async (id, name) => {
    const a = window.prompt(`Add coins to ${name} (₹):`);
    if (!a || isNaN(a) || parseInt(a) <= 0) return;
    const d = await api.put(`/admin/users/${id}/coins`, { amount:parseInt(a), action:'add', coin_type:'real', reason:'⚙️ Admin Added' });
    if (d?.success) { showToast('✅ +₹'+parseInt(a)+' → '+name, 'win'); loadAll(); }
    else showToast('❌ Failed', 'lose');
  };

  const banUser = async (id, ban) => {
    const d = await api.put(`/admin/users/${id}/ban`, { ban });
    if (d?.success) { showToast(ban?'🚫 Banned!':'✅ Unbanned!', ban?'lose':'win'); loadAll(); }
  };

  const approveDep = async (id, action) => {
    const d = await api.put(`/admin/deposits/${id}`, { action });
    if (d?.success) { showToast(action==='approve'?'✅ Approved!':'❌ Rejected', action==='approve'?'win':'lose'); loadAll(); }
  };

  const setOverride = async () => {
    if (overrideNum === null) { showToast('⚠️ Select number first!', 'lose'); return; }
    const d = await api.post('/admin/wingo/override', { period_number:wingoPeriod, override_number:overrideNum });
    if (!d?.success) { showToast('❌ Failed', 'lose'); return; }
    showToast(`✅ Override: #${overrideNum}`, 'win');
    setOverrideStatus(overrideNum); loadAll();
  };

  const clearOverride = async () => {
    await api.post('/admin/wingo/override', { period_number:wingoPeriod, override_number:null });
    showToast('🗑️ Cleared', 'info'); setOverrideNum(null); setOverrideStatus(null);
  };

  const TABS = ['dashboard','users','payments','games','wingo'];

  // Filtered deposits
  const filteredDeps = deps.filter(d => payTab === 'all' ? true : d.type === payTab);
  const depositCount = deps.filter(d => d.type === 'deposit' && d.status === 'pending').length;
  const withdrawCount = deps.filter(d => d.type === 'withdraw' && d.status === 'pending').length;

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      <div className="game-bar">
        <button className="back-btn" onClick={()=>navigate('/')}>← BACK</button>
        <div className="game-bar-title">⚙️ ADMIN PANEL</div>
        <button onClick={logout} style={{background:'rgba(255,34,68,.12)',border:'1.5px solid rgba(255,34,68,.3)',color:'var(--red)',padding:'6px 12px',borderRadius:10,fontFamily:'Orbitron',fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:1}}>
          🚪 LOGOUT
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map(t => <div key={t} className={'admin-tab'+(tab===t?' active':'')} onClick={()=>setTab(t)}>{t.toUpperCase()}</div>)}
      </div>

      <div className="page-scroll">

        {/* DASHBOARD */}
        {tab==='dashboard' && (
          <div>
            <div className="astat-grid">
              {[['👥',stats.total_users||0,'PLAYERS'],['🟢',stats.active_today||0,'ACTIVE TODAY'],['🎲',stats.total_bets||0,'TOTAL BETS'],['⏳',stats.pending_deposits||0,'PENDING']].map(([icon,val,lbl])=>(
                <div key={lbl} className="astat"><div className="astat-val">{icon} {val}</div><div className="astat-lbl">{lbl}</div></div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab==='users' && (
          <div>
            {users.map(u => (
              <div key={u.id} className="auser">
                <div>
                  <div className="auser-name">👤 {u.username}{u.role==='admin'?' 👑':''}</div>
                  <div className="auser-meta">💰₹{parseInt(u.coins).toLocaleString()} 🎁{parseInt(u.bonus_coins||0)} | {u.is_banned?'🚫 Banned':'✅ Active'}</div>
                </div>
                <div className="abtns">
                  <button className="abtn add" onClick={()=>addCoins(u.id,u.username)}>+₹</button>
                  <button className="abtn ban" onClick={()=>banUser(u.id,u.is_banned?0:1)}>{u.is_banned?'Unban':'Ban'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAYMENTS */}
        {tab==='payments' && (
          <div>
            <div className="card">
              <div className="card-title">⚙️ PAYMENT SETTINGS</div>
              <div className="fg"><label>UPI ID</label><input value={upi} onChange={e=>setUpi(e.target.value)} placeholder="casino@upi" /></div>
              <div className="fg"><label>SITE URL</label><input value={siteUrl} onChange={e=>setSiteUrl(e.target.value)} placeholder="https://yoursite.com" /></div>
              <div className="fg"><label>TELEGRAM LINK</label><input value={tgLink} onChange={e=>setTgLink(e.target.value)} placeholder="https://t.me/yoursupport" /></div>
              <button className="btn-gold" onClick={savePaySettings}>💾 SAVE SETTINGS</button>
            </div>

            {/* Sub Tabs */}
            <div style={{display:'flex',gap:8,margin:'14px 0 10px'}}>
              {[
                {key:'all', label:'📋 ALL', count: deps.filter(d=>d.status==='pending').length},
                {key:'deposit', label:'📥 DEPOSITS', count: depositCount},
                {key:'withdraw', label:'📤 WITHDRAWALS', count: withdrawCount},
              ].map(({key, label, count}) => (
                <button key={key} onClick={()=>setPayTab(key)}
                  style={{flex:1,padding:'8px 4px',borderRadius:10,border:'1.5px solid',fontFamily:'Orbitron',fontSize:8,fontWeight:700,cursor:'pointer',position:'relative',
                    background: payTab===key ? (key==='withdraw'?'rgba(255,34,68,.15)':key==='deposit'?'rgba(0,230,118,.12)':'rgba(255,193,7,.1)') : 'rgba(255,255,255,.04)',
                    borderColor: payTab===key ? (key==='withdraw'?'var(--red)':key==='deposit'?'var(--teal)':'var(--gold)') : 'rgba(255,255,255,.1)',
                    color: payTab===key ? (key==='withdraw'?'var(--red)':key==='deposit'?'var(--teal)':'var(--gold)') : '#888'
                  }}>
                  {label}
                  {count > 0 && (
                    <span style={{position:'absolute',top:-6,right:-4,background:'var(--red)',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="sec-sep">
              {payTab==='deposit'?'📥 DEPOSIT REQUESTS':payTab==='withdraw'?'📤 WITHDRAWAL REQUESTS':'⏳ ALL REQUESTS'}
            </div>

            {!filteredDeps.length
              ? <div className="empty">Koi request nahi 🎉</div>
              : filteredDeps.map(d => {
                  const isW = d.type === 'withdraw';
                  return (
                    <div key={d.id} className="dep-req">
                      <div>
                        <div className="dep-req-name">{isW?'📤':'📥'} {d.username} — 🪙{parseInt(d.amount).toLocaleString()}</div>
                        <div className="dep-req-meta">{isW?'WITHDRAW':'DEPOSIT'} | {d.payment_method||''}</div>
                        <div className="dep-req-meta">{d.payment_proof||''}</div>
                        <div className="dep-req-meta" style={{color: d.status==='approved'?'var(--teal)':d.status==='rejected'?'var(--red)':'var(--gold)'}}>
                          {d.status==='approved'?'✅ Approved':d.status==='rejected'?'❌ Rejected':'⏳ Pending'}
                        </div>
                      </div>
                      {d.status==='pending' && (
                        <div className="abtns">
                          <button className="abtn ok" onClick={()=>approveDep(d.id,'approve')}>✅</button>
                          <button className="abtn no" onClick={()=>approveDep(d.id,'reject')}>❌</button>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* GAMES */}
        {tab==='games' && (
          <div>
            {Object.entries(GAME_NAMES).map(([g, name]) => {
              const enabled = localGs[g] !== false;
              return (
                <div key={g} className={'tog-card '+(enabled?'on':'off')}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{name}</div>
                    <div className={'tog-status '+(enabled?'on':'off')}>{enabled?'ENABLED':'DISABLED'}</div>
                  </div>
                  <div className={'tog-switch '+(enabled?'on':'')} onClick={()=>toggleGame(g)}>
                    <div className="tog-knob"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WINGO OVERRIDE */}
        {tab==='wingo' && (
          <div>
            <div className="card">
              <div className="card-title">🎨 WINGO OVERRIDE</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:'#aaa'}}>Current Period</div>
                <div style={{fontFamily:'Orbitron',fontSize:14,color:'var(--teal)',fontWeight:700}}>{wingoPeriod}</div>
              </div>
              <div style={{marginBottom:12,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',fontSize:11}}>
                {overrideStatus!==null && overrideStatus!==undefined
                  ? <span style={{color:'var(--gold)',fontWeight:700}}>⚡ SET: #{overrideStatus}</span>
                  : <span style={{color:'#888'}}>No override — RANDOM</span>
                }
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:12}}>
                {[...Array(10)].map((_,i) => (
                  <div key={i} className={'nsel-btn'+(overrideNum===i?' sel':'')} onClick={()=>setOverrideNum(i)}>
                    <span className="nsel-num">{i}</span>
                    <span className="nsel-info">{COLOR_MAP[i].slice(0,3).toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <button className="btn-gold" onClick={setOverride}>⚡ SET OVERRIDE</button>
                <button style={{padding:12,background:'rgba(255,34,68,.1)',border:'1.5px solid rgba(255,34,68,.3)',borderRadius:12,color:'var(--red)',fontFamily:'Orbitron',fontSize:10,fontWeight:700,cursor:'pointer'}} onClick={clearOverride}>🗑️ CLEAR</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}