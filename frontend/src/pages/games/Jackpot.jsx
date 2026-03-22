import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../api/axios';
import './Jackpot.css';

export default function Jackpot() {
  const navigate = useNavigate();
  const { applyCoins, gameSettings } = useAuth();
  const { showToast, showModal, confetti } = useUI();
  const [sel, setSel] = useState([]);
  const [winning, setWinning] = useState([]);
  const [matched, setMatched] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState(null);

  const toggleNum = (n) => {
    if (result) return;
    setSel(s => s.includes(n) ? s.filter(x=>x!==n) : s.length<5 ? [...s,n] : s);
  };

  const draw = async () => {
    if (sel.length !== 5) { showToast('⚠️ Exactly 5 numbers choose karo!', 'lose'); return; }
    if (gameSettings.jackpot === false) { showToast('🚫 Jackpot disabled', 'lose'); return; }
    setPlaying(true);
    const d = await api.post('/games/jackpot/buy', { selected_numbers: sel });
    setPlaying(false);
    if (!d?.success) { showToast('❌ '+(d?.message||'Failed'), 'lose'); return; }
    applyCoins(d);
    setWinning(d.winning_numbers);
    setMatched(d.matched_numbers);
    setResult(d);
    if (d.win_amount > 0) {
      confetti();
      showModal('💎','YOU WON!',`${d.matches}/5 matched!`,`+🪙${d.win_amount}`);
    } else {
      showToast('😔 '+(d.matches)+'/5 matched — try again!', 'lose');
    }
  };

  const reset = () => { setSel([]); setWinning([]); setMatched([]); setResult(null); };

  return (
    <div className="page-scroll">
      {gameSettings.jackpot===false && <div className="disabled-msg">🚫 Jackpot is currently disabled by admin.</div>}
      <div style={{display:gameSettings.jackpot===false?'none':'block'}}>
        <div className="game-bar"><button className="back-btn" onClick={()=>navigate('/')}>← BACK</button><div className="game-bar-title">💎 Jackpot Lotto</div></div>
        <div className="htp-card">
          <div className="htp-header" onClick={e=>{e.currentTarget.nextElementSibling.classList.toggle('open');e.currentTarget.querySelector('.htp-arrow').classList.toggle('open');}}>
            <div className="htp-title">📖 HOW TO PLAY</div><div className="htp-arrow">▼</div>
          </div>
          <div className="htp-body">
            <div className="htp-step"><div className="htp-num">1</div><div className="htp-text">1–35 mein se <strong>5 numbers</strong> choose karo</div></div>
            <div className="htp-step"><div className="htp-num">2</div><div className="htp-text">🪙100 entry — <strong>DRAW LOTTERY</strong> press karo</div></div>
            <div className="htp-step"><div className="htp-num">3</div><div className="htp-text">1+ match = 🪙50 | 3+ = 🪙150 | 5 = 🪙300</div></div>
            <div className="htp-prize">🏆 Entry: 🪙100 | 5 match: 🪙300 | 3 match: 🪙150 | 1 match: 🪙50</div>
          </div>
        </div>
        <div className="jp-pool">
          <div style={{fontSize:9,color:'var(--gold)',letterSpacing:3,marginBottom:6}}>ENTRY FEE</div>
          <div className="jp-pool-amt">🪙 100</div>
          <div style={{fontSize:10,color:'#aaa',marginTop:4}}>Choose exactly 5 numbers from 1–35</div>
        </div>
        <div className="lotto-grid">
          {[...Array(35)].map((_,i) => {
            const n = i+1;
            const isSel = sel.includes(n);
            const isWin = winning.includes(n);
            const isMatch = matched.includes(n);
            return (
              <div key={n} className={'lotto-n'+(isSel?' sel':'')+(isWin?' win':'')+(isMatch?' match':'')} onClick={()=>toggleNum(n)}>
                {n}
              </div>
            );
          })}
        </div>
        <div className="sel-balls">
          {sel.map(n => <div key={n} className="sel-ball">{n}</div>)}
          {[...Array(5-sel.length)].map((_,i) => <div key={'e'+i} className="sel-ball-empty">?</div>)}
        </div>
        {result && (
          <div className={'jp-result '+(result.win_amount>0?'win':'lose')}>
            {result.win_amount>0 ? `🏆 ${result.matches}/5 matched! +🪙${result.win_amount}` : `😔 ${result.matches}/5 matched — Better luck next time!`}
            <br/><span style={{fontSize:10,opacity:.8}}>Winning: {winning.join(', ')}</span>
          </div>
        )}
        {!result ? (
          <button className="draw-btn" onClick={draw} disabled={sel.length!==5||playing}>
            {playing ? '🎲 DRAWING...' : `💎 DRAW LOTTERY (${sel.length}/5)`}
          </button>
        ) : (
          <button className="draw-btn" onClick={reset}>🔄 PLAY AGAIN</button>
        )}
      </div>
    </div>
  );
}
