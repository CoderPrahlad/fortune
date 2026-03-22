import { useState, useEffect } from 'react';
import api from '../api/axios';
import './History.css';

const FILTERS = ['all','aviator','slots','wingo','cards','jackpot'];
const LABELS  = { all:'All', aviator:'Aviator', slots:'Slots', wingo:'Wingo', cards:'Cards', jackpot:'Jackpot' };
const ICONS   = { aviator:'✈️', slots:'🎰', wingo:'🎨', cards:'🃏', jackpot:'💎' };
const COLORS  = { aviator:'#6644ff', slots:'#ff2244', wingo:'#ff8800', cards:'#9900cc', jackpot:'#00aaff' };

export default function History() {
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const d = await api.get('/wallet/game-history');
    if (d?.success) setAll(d.history || []);
  };

  const filtered = filter === 'all' ? all : all.filter(h => h.game === filter);

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>

      {/* Header */}
      <div style={{padding:'12px 16px 8px',background:'rgba(4,14,4,.98)',borderBottom:'1px solid rgba(255,215,0,.1)',flexShrink:0}}>
        <div style={{fontFamily:'Cinzel Decorative',fontSize:14,color:'var(--gold)',marginBottom:10}}>📋 Game History</div>
        {/* Filter Tabs */}
        <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none'}}>
          {FILTERS.map(f => (
            <button key={f} className={'gh-filter-btn'+(filter===f?' active':'')} onClick={()=>setFilter(f)}>
              {f!=='all' ? ICONS[f]+' ' : '🎮 '}{LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="page-scroll">
        {!filtered.length
          ? <div className="empty">Koi history nahi — pehle khelo!</div>
          : filtered.map(h => {
            const net = (h.payout || 0) - (h.bet || 0);
            const isWin = net > 0;
            const gameColor = COLORS[h.game] || '#888';
            return (
              <div key={h.id} className="gh-card" style={{borderLeftColor: isWin ? 'var(--green)' : 'var(--red)'}}>
                <div className="gh-card-left">
                  {/* Game icon circle */}
                  <div className="gh-icon-wrap" style={{background: gameColor+'22', border:`2px solid ${gameColor}55`}}>
                    <span style={{fontSize:22}}>{ICONS[h.game]||'🎮'}</span>
                  </div>
                  <div>
                    <div className="gh-game-name">{ICONS[h.game]} {h.game?.charAt(0).toUpperCase()+h.game?.slice(1)}</div>
                    <div className="gh-bet-line">Bet: <span style={{color:'var(--gold)'}}>🪙{parseInt(h.bet).toLocaleString()}</span></div>
                    <div className="gh-date">{new Date(h.created_at).toLocaleString()}</div>
                    {h.result && (
                      <div className="gh-result-text">{h.result}</div>
                    )}
                  </div>
                </div>
                <div className="gh-card-right">
                  <div className={'gh-net '+(isWin?'win':'loss')}>
                    {isWin?'▲ Net: +':'▼ Net: -'}🪙{Math.abs(net).toLocaleString()}
                  </div>
                  {h.payout > 0 && (
                    <div className="gh-payout">+🪙{parseInt(h.payout).toLocaleString()}</div>
                  )}
                  <div className={'gh-badge '+(isWin?'win':'loss')}>{isWin?'WIN':'LOSS'}</div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
