import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Leaderboard() {
  const [data, setData] = useState([]);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const d = await api.get('/wallet/leaderboard');
    if (d?.success) setData(d.leaderboard || []);
  };
  const medals = ['🥇','🥈','🥉'];
  const rankColors = ['var(--gold)','#C0C0C0','#CD7F32'];
  return (
    <div className="page-scroll">
      <div style={{fontFamily:'Cinzel Decorative',fontSize:16,color:'var(--gold)',textAlign:'center',marginBottom:16,letterSpacing:2}}>🏆 TOP PLAYERS</div>
      {!data.length ? <div className="empty">No players yet!</div> : data.map((p,i) => (
        <div key={p.id} className="lb-item" style={{borderColor: i<3?'rgba(255,215,0,.18)':'rgba(255,255,255,.06)'}}>
          <div style={{fontFamily:'Orbitron',fontSize:14,fontWeight:900,width:26,textAlign:'center',color:rankColors[i]||'#ddd'}}>
            {i<3?medals[i]:i+1}
          </div>
          <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#1a3a1a,#2a6a2a)',border:'2px solid rgba(255,215,0,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {p.avatar||'👤'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}>👤 {p.username}</div>
            <div style={{fontSize:9,color:'#aaa'}}>{p.total_wins} wins</div>
          </div>
          <div style={{fontFamily:'Orbitron',fontSize:12,color:'var(--gold)',fontWeight:700}}>🪙{parseInt(p.total_won||0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
