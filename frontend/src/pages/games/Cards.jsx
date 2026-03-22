import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../api/axios';
import './Cards.css';

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
  const playFlip = () => {
    beep(440, 0.08, 'sine', 0.12);
    setTimeout(() => beep(660, 0.06, 'sine', 0.1), 80);
  };
  const playWin = () => {
    [523,659,784,1047,1319].forEach((n,i) => setTimeout(() => beep(n, 0.2, 'sine', 0.25), i*100));
  };
  const playLose = () => {
    beep(300, 0.15, 'sawtooth', 0.12);
    setTimeout(() => beep(220, 0.3, 'sawtooth', 0.1), 150);
  };
  return { playFlip, playWin, playLose };
}

// ── High quality SVG card renderer ──
function CardFace({ type, isAce }) {
  // type: 'ace_spade' | 'king_club' | 'queen_heart' | 'joker'
  const cards = {
    ace_spade: { rank: 'A', suit: '♠', color: '#1a0040', accent: '#9900ff', suitColor: '#fff', label: 'EKKA' },
    king_club:  { rank: 'K', suit: '♣', color: '#001a00', accent: '#00cc44', suitColor: '#fff', label: 'BADSHA' },
    queen_heart:{ rank: 'Q', suit: '♥', color: '#1a0000', accent: '#ff2244', suitColor: '#ff2244', label: 'RANI' },
  };
  const c = cards[type] || cards.ace_spade;
  return (
    <svg viewBox="0 0 90 130" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id={`cg_${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.color}/>
          <stop offset="100%" stopColor={c.accent+'33'}/>
        </linearGradient>
        <linearGradient id={`sh_${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)"/>
        </linearGradient>
      </defs>
      {/* Card background */}
      <rect x="2" y="2" width="86" height="126" rx="10" fill={`url(#cg_${type})`} stroke={c.accent} strokeWidth="2"/>
      <rect x="2" y="2" width="86" height="126" rx="10" fill={`url(#sh_${type})`}/>
      {/* Corner rank top-left */}
      <text x="10" y="22" fontSize="16" fontWeight="900" fill={c.suitColor} fontFamily="serif">{c.rank}</text>
      <text x="10" y="36" fontSize="14" fill={c.suitColor} fontFamily="serif">{c.suit}</text>
      {/* Corner rank bottom-right (rotated) */}
      <text x="80" y="112" fontSize="16" fontWeight="900" fill={c.suitColor} fontFamily="serif" textAnchor="middle" transform="rotate(180,80,108)">{c.rank}</text>
      <text x="80" y="126" fontSize="14" fill={c.suitColor} fontFamily="serif" textAnchor="middle" transform="rotate(180,80,122)">{c.suit}</text>
      {/* Center big suit */}
      <text x="45" y="78" fontSize="42" fill={c.suitColor} fontFamily="serif" textAnchor="middle" dominantBaseline="middle">{c.suit}</text>
      {/* Center rank */}
      <text x="45" y="108" fontSize="18" fontWeight="900" fill={c.accent} fontFamily="serif" textAnchor="middle" letterSpacing="1">{c.rank}</text>
      {/* Glow overlay for ace */}
      {type==='ace_spade' && <rect x="2" y="2" width="86" height="126" rx="10" fill="rgba(153,0,255,0.06)"/>}
      {/* Label at bottom */}
      <text x="45" y="122" fontSize="7" fill={c.accent} fontFamily="sans-serif" textAnchor="middle" letterSpacing="2" fontWeight="700">{c.label}</text>
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 90 130" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a0033"/>
          <stop offset="100%" stopColor="#0d0020"/>
        </linearGradient>
        <pattern id="backPattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="none"/>
          <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="rgba(153,0,255,0.2)" stroke="rgba(153,0,255,0.35)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect x="2" y="2" width="86" height="126" rx="10" fill="url(#backGrad)" stroke="rgba(153,0,255,0.6)" strokeWidth="2"/>
      <rect x="2" y="2" width="86" height="126" rx="10" fill="url(#backPattern)"/>
      <rect x="8" y="8" width="74" height="114" rx="7" fill="none" stroke="rgba(153,0,255,0.4)" strokeWidth="1.5"/>
      <text x="45" y="72" fontSize="36" textAnchor="middle" dominantBaseline="middle" fill="rgba(153,0,255,0.7)" fontFamily="serif" fontWeight="900">?</text>
    </svg>
  );
}

// Non-ace cards: random from these
const NON_ACE_TYPES = ['king_club','queen_heart'];

export default function Cards() {
  const navigate = useNavigate();
  const { applyCoins, gameSettings } = useAuth();
  const { showToast, showModal, confetti } = useUI();
  const { playFlip, playWin, playLose } = useSound();

  const [cardTypes, setCardTypes] = useState([null, null, null]);
  const [picked, setPicked] = useState(null);
  const [acePos, setAcePos] = useState(null);
  const [flipped, setFlipped] = useState([false, false, false]);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState({ msg: '🃏 Ek card tap karo — Ekka dhundo!', cls: '' });

  const reset = () => {
    setCardTypes([null,null,null]); setPicked(null); setAcePos(null);
    setFlipped([false,false,false]); setPlaying(false);
    setHint({ msg: '🃏 Ek card tap karo — Ekka dhundo!', cls: '' });
  };

  const pickCard = async (idx) => {
    if (picked !== null || playing) return;
    if (gameSettings.cards === false) { showToast('🚫 Card game disabled', 'lose'); return; }
    setPlaying(true); setPicked(idx);
    playFlip();

    const d = await api.post('/games/cards/play', { selected_card: idx });
    if (!d?.success) { showToast('❌ '+(d?.message||'Failed'), 'lose'); setPlaying(false); setPicked(null); return; }
    applyCoins(d);

    const ace = d.ace_position;
    setAcePos(ace);

    // Assign card types
    const types = [null,null,null];
    types[ace] = 'ace_spade';
    for (let i=0;i<3;i++) {
      if (i !== ace) types[i] = NON_ACE_TYPES[i === 0 ? 0 : 1];
    }
    setCardTypes(types);

    // Flip picked card first
    const newFlipped = [false,false,false];
    newFlipped[idx] = true;
    setFlipped([...newFlipped]);

    // Flip all after 700ms
    setTimeout(() => setFlipped([true,true,true]), 700);

    if (d.is_win) {
      setHint({ msg: '🏆 EKKA MILA! +🪙50!', cls: 'result-win' });
      // Wait for all cards to flip (700ms) + extra 400ms, then show win
      setTimeout(() => {
        playWin();
        confetti();
        showModal('🃏', 'EKKA MILA! 🏆', 'Badhai ho! Tune sahi card choose kiya!', '+🪙50');
      }, 1200);
    } else {
      setHint({ msg: `😔 Nahi mila! Ekka card #${ace+1} tha`, cls: 'result-lose' });
      setTimeout(() => playLose(), 800);
    }
    setPlaying(false);
  };

  return (
    <div className="page-scroll">
      {gameSettings.cards===false && <div className="disabled-msg">🚫 Card game is currently disabled by admin.</div>}
      <div style={{display:gameSettings.cards===false?'none':'block'}}>
        <div className="game-bar">
          <button className="back-btn" onClick={()=>navigate('/')}>← BACK</button>
          <div className="game-bar-title">🃏 Find the Ace</div>
        </div>

        <div className="htp-card">
          <div className="htp-header" onClick={e=>{e.currentTarget.nextElementSibling.classList.toggle('open');e.currentTarget.querySelector('.htp-arrow').classList.toggle('open');}}>
            <div className="htp-title">📖 HOW TO PLAY</div><div className="htp-arrow">▼</div>
          </div>
          <div className="htp-body">
            <div className="htp-step"><div className="htp-num">1</div><div className="htp-text">3 ulte cards — <strong>ek Ekka (Ace♠) chhupa hai</strong></div></div>
            <div className="htp-step"><div className="htp-num">2</div><div className="htp-text">🪙20 entry — <strong>ek card tap karo</strong></div></div>
            <div className="htp-step"><div className="htp-num">3</div><div className="htp-text">Ekka mila → <strong>+🪙50!</strong> Miss → <strong>-🪙20</strong></div></div>
            <div className="htp-prize">💰 Entry: 🪙20 | 🏆 Win: 🪙50 | Chance: 1/3 (33%)</div>
          </div>
        </div>

        <div className="card card-game-outer">
          {/* Bet Info */}
          <div className="card-bet-info">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:10,color:'#ddd',letterSpacing:2,marginBottom:4}}>ENTRY</div>
                <div style={{fontFamily:'Orbitron',fontSize:20,color:'var(--red)',fontWeight:700}}>🪙 20</div>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:10,color:'#ddd',letterSpacing:2,marginBottom:4}}>WIN</div>
                <div style={{fontFamily:'Orbitron',fontSize:20,color:'#00ff64',fontWeight:700}}>🪙 50</div>
              </div>
            </div>
          </div>

          {/* Hint */}
          <div className={'card-hint'+(hint.cls?' '+hint.cls:'')}>{hint.msg}</div>

          {/* Cards */}
          <div className="cards-stage">
            {[0,1,2].map(i => (
              <div key={i} className="card-wrap">
                <div
                  className={'play-card'+(picked!==null?' picked':'')+(flipped[i]?' flipped':'')}
                  onClick={() => pickCard(i)}
                >
                  <div className="card-inner">
                    <div className="card-face card-back-face"><CardBack /></div>
                    <div className={'card-face card-front-face'+(picked!==null?(acePos===i?' win-glow':' lose-glow'):'')}>
                      {cardTypes[i] ? <CardFace type={cardTypes[i]} /> : null}
                    </div>
                  </div>
                </div>
                {/* Card number BELOW card */}
                <div className="card-num">{i+1}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          {picked !== null
            ? <button className="card-play-btn" onClick={reset}>🔄 PLAY AGAIN</button>
            : <button className="card-play-btn" disabled>🃏 TAP A CARD TO PLAY (🪙20)</button>
          }
        </div>
      </div>
    </div>
  );
}
