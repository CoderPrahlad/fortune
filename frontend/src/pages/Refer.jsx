import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';

export default function Refer() {
  const { siteSettings } = useAuth();
  const { showToast } = useUI();
  const [info, setInfo] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const d = await api.get('/auth/refer-info');
    if (d?.success) setInfo(d);
  };

  const code = info?.refer_code || '------';
  const base = siteSettings.site_url || window.location.origin;
  const shareUrl = `${base}?ref=${code}`;

  const copyCode = () => navigator.clipboard.writeText(code).then(() => showToast('📋 Code Copied!', 'info'));
  const copyLink = () => navigator.clipboard.writeText(shareUrl).then(() => showToast('🔗 Link Copied!', 'info'));

  return (
    <div className="page-scroll">
      <div className="refer-hero">
        <div style={{fontSize:36,marginBottom:8}}>👥</div>
        <div style={{fontFamily:'Orbitron',fontSize:13,fontWeight:900,color:'var(--teal)',letterSpacing:2,marginBottom:4}}>REFER & EARN</div>
        <div style={{fontSize:11,color:'#aaa',marginBottom:12}}>Invite friends and earn 🎁150 bonus coins per referral!</div>
        <div className="refer-code-box" onClick={copyCode}>
          <div style={{fontSize:9,color:'var(--teal)',letterSpacing:3,marginBottom:4}}>YOUR REFER CODE</div>
          <div className="refer-code">{code}</div>
          <div style={{fontSize:9,color:'#aaa',marginTop:4}}>TAP TO COPY</div>
        </div>
      </div>

      <div className="refer-stats">
        <div className="rs-box"><div className="rs-val">{info?.total_referrals||0}</div><div className="rs-lbl">TOTAL REFERRALS</div></div>
        <div className="rs-box"><div className="rs-val" style={{color:'var(--gold)'}}>🎁{(info?.total_referrals||0)*150}</div><div className="rs-lbl">TOTAL EARNED</div></div>
      </div>

      <div className="share-link-box">
        <div className="share-link-text">SHARE LINK</div>
        <div className="share-link-url">{shareUrl}</div>
        <button className="share-copy-btn" onClick={copyLink}>📋 COPY LINK</button>
      </div>

      <div className="sec-sep">👥 YOUR REFERRALS</div>
      {!info?.referrals?.length
        ? <div className="empty">No referrals yet! Share your code.</div>
        : info.referrals.map(r => (
          <div key={r.id} className="ref-item">
            <div>
              <div style={{fontSize:12,fontWeight:700}}>👤 {r.username}</div>
              <div style={{fontSize:9,color:'#aaa',marginTop:2}}>{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div style={{color:'var(--teal)',fontFamily:'Orbitron',fontSize:11}}>+🎁{r.bonus_given}</div>
          </div>
        ))
      }
    </div>
  );
}
