import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../api/axios';
import './Slots.css';

const ALL_SYMS = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣'];

// ── Sound engine ──
function useSound() {
  const ctx = useRef(null);
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctx.current;
  };
  const beep = (freq, dur, type='sine', vol=0.18) => {
    try {
      const ac = getCtx();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch(e){}
  };
  const playSpinSound = () => {
    // Casino melody loop during spin
    [0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.5,1.8,2.1,2.4,2.7,3.0,3.3,3.6,3.9,4.2,4.5].forEach((t,i) => {
      setTimeout(() => beep(300 + (i%8)*80, 0.09, 'square', 0.08), t*1000);
    });
  };
  const playReelStop = () => { beep(520, 0.12, 'sine', 0.15); setTimeout(()=>beep(380,0.08,'sine',0.1),80); };
  const playWin = (mult) => {
    const notes = mult >= 10
      ? [523,659,784,1047,1319]
      : mult >= 3
      ? [523,659,784,1047]
      : [523,659,784];
    notes.forEach((n,i) => setTimeout(() => beep(n, 0.18, 'sine', 0.22), i*120));
  };
  const playLose = () => { beep(200, 0.3, 'sawtooth', 0.1); };
  return { playSpinSound, playReelStop, playWin, playLose };
}

export default function Slots() {
  const navigate = useNavigate();
  const { applyCoins, gameSettings } = useAuth();
  const { showToast, showModal, confetti } = useUI();
  const { playSpinSound, playReelStop, playWin, playLose } = useSound();

  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒','🍋','🍊']);
  const [result, setResult] = useState('');
  // Each reel animating independently
  const [reelAnim, setReelAnim] = useState([false,false,false]);

  const chgBet = (d) => setBet(b => Math.max(10, Math.min(5000, b+d)));

  const spin = async () => {
    if (spinning) return;
    if (gameSettings.slots === false) { showToast('🚫 Slots disabled', 'lose'); return; }
    setSpinning(true); setResult('');
    setReelAnim([true, true, true]);

    // Start sound
    playSpinSound();

    // Call API
    const d = await api.post('/games/slots/spin', { bet_amount: bet });

    if (!d?.success) {
      setReelAnim([false,false,false]);
      showToast('❌ '+(d?.message||'Failed'), 'lose');
      setSpinning(false); return;
    }

    // Staggered reel stops: 1.8s, 2.6s, 3.4s — slow & realistic
    const finalSyms = d.symbols;
    const stopTimes = [1800, 2600, 3400];

    stopTimes.forEach((ms, i) => {
      setTimeout(() => {
        setReelAnim(prev => { const n=[...prev]; n[i]=false; return n; });
        setReels(prev => { const n=[...prev]; n[i]=finalSyms[i]; return n; });
        playReelStop();
      }, ms);
    });

    // After all reels stop
    setTimeout(() => {
      applyCoins(d);
      if (d.is_win) {
        const multMatch = d.message?.match(/x(\d+)/i);
        const mult = multMatch ? parseInt(multMatch[1]) : 2;
        playWin(mult);
        setResult('🏆 '+d.message);
        confetti();
        showModal('🎰','WINNER!', d.message, `+🪙${d.win_amount.toLocaleString()}`);
      } else {
        playLose();
        setResult('😔 No match — try again!');
      }
      setSpinning(false);
    }, 3600);
  };

  return (
    <div className="page-scroll">
      {gameSettings.slots===false && <div className="disabled-msg">🚫 Slots is currently disabled by admin.</div>}
      <div style={{display:gameSettings.slots===false?'none':'block'}}>
        <div className="game-bar">
          <button className="back-btn" onClick={()=>navigate('/')}>← BACK</button>
          <div className="game-bar-title">🎰 Super Slots</div>
        </div>

        <div className="htp-card">
          <div className="htp-header" onClick={e=>{e.currentTarget.nextElementSibling.classList.toggle('open');e.currentTarget.querySelector('.htp-arrow').classList.toggle('open');}}>
            <div className="htp-title">📖 HOW TO PLAY</div><div className="htp-arrow">▼</div>
          </div>
          <div className="htp-body">
            <div className="htp-step"><div className="htp-num">1</div><div className="htp-text">Bet set karo — <strong>₹10 se ₹5000 tak</strong></div></div>
            <div className="htp-step"><div className="htp-num">2</div><div className="htp-text"><strong>SPIN</strong> dabao — 3 reels spin honge</div></div>
            <div className="htp-step"><div className="htp-num">3</div><div className="htp-text">3 same symbols = <strong>jackpot!</strong> 2 same = ×2</div></div>
            <div className="htp-prize">🏆 💎×50 | 7️⃣×20 | 🍒×10 | ⭐×8 | Any 2 = ×2</div>
          </div>
        </div>

        <div className="slot-machine">
          <div style={{textAlign:'center',marginBottom:8}}>
            <div style={{fontFamily:'Cinzel Decorative',fontSize:13,color:'var(--gold)'}}>SUPER SLOTS 777</div>
            <div className="slot-lights">{[...Array(7)].map((_,i)=><div key={i} className="sl"></div>)}</div>
          </div>

          <div className="reels">
            {reels.map((sym, i) => (
              <div key={i} className="reel">
                <div className={`reel-track ${reelAnim[i] ? 'spinning' : ''}`}>
                  {/* Show blurred symbols while spinning */}
                  {reelAnim[i] ? (
                    <>
                      {[...ALL_SYMS,...ALL_SYMS].map((s,j)=>(
                        <span key={j} className="reel-sym-scroll">{s}</span>
                      ))}
                    </>
                  ) : (
                    <span className="reel-sym">{sym}</span>
                  )}
                </div>
                <div className="reel-line"></div>
              </div>
            ))}
          </div>

          <div style={{fontSize:9,color:'#aaa',textAlign:'center',marginBottom:7,letterSpacing:1}}>BET AMOUNT</div>
          <div className="bet-ctrl">
            <div className="bet-adj" onClick={()=>chgBet(-50)}>−</div>
            <div className="bet-disp">🪙<span>{bet}</span></div>
            <div className="bet-adj" onClick={()=>chgBet(50)}>+</div>
          </div>

          <button className="spin-btn" onClick={spin} disabled={spinning}>
            {spinning ? '🎰 SPINNING...' : '🎰 SPIN'}
          </button>

          {result && (
            <div className={'game-result '+(result.includes('🏆')?'win':'lose')}>{result}</div>
          )}

          <div className="paytable">
            <div style={{fontSize:9,color:'var(--gold)',letterSpacing:3,textAlign:'center',marginBottom:7}}>— PAYTABLE —</div>
            {[['💎💎💎','×50'],['7️⃣7️⃣7️⃣','×20'],['🍒🍒🍒','×10'],['⭐⭐⭐','×8'],['Any 2 same','×2']].map(([s,m])=>(
              <div key={s} className="pt-row"><span>{s}</span><span className="pt-mult">{m}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
