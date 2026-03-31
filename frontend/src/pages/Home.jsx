import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';
import './Home.css';

const GAME_ICONS  = { aviator:'✈️', slots:'🎰', wingo:'🎨', cards:'🃏', jackpot:'💎' };
const GAME_NAMES  = { aviator:'Aviator', slots:'Super Slots', wingo:'Wingo Color', cards:'Find the Ace', jackpot:'Jackpot Lotto' };
const GAME_DESCS  = { aviator:'Fly & Cash Out', slots:'Spin & Win!', wingo:'Color+Size+Number', cards:'Teen cards, ek Ekka!', jackpot:'Pick 5 Numbers' };
const GAME_RATES  = { aviator:'Up to 100x 🚀', slots:'Win Rate 95%', wingo:'2x–9x Multiply', cards:'Win 🪙50 / Entry 🪙20', jackpot:'Jackpot Pool!' };
const GAME_BADGES = { aviator:'HOT', slots:'HOT', wingo:'HOT', cards:'NEW', jackpot:'BIG' };
const BADGE_COLOR = { aviator:'#ff2244', slots:'#ff2244', wingo:'#ff2244', cards:'#00cc44', jackpot:'#9b00ff' };

export default function Home({ onDepositClick }) {
  const { coins, bonus, gameSettings, applyCoins } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [jpAmt, setJpAmt] = useState(1094074);
  const [bonusClaiming, setBonusClaiming] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setJpAmt(p => p + Math.floor(Math.random()*45+8)), 3500);
    return () => clearInterval(t);
  }, []);

  const handleDailyBonus = async () => {
    if (bonusClaiming) return;
    setBonusClaiming(true);
    const d = await api.post('/auth/daily-bonus');
    setBonusClaiming(false);
    if (!d?.success) { showToast('❌ ' + (d?.message || 'Already claimed!'), 'lose'); return; }
    applyCoins(d);
    showToast('🎁 +50 Bonus Coins claimed!', 'win');
  };

  const goGame = (g) => {
    if (gameSettings[g] === false) { showToast('🚫 Game disabled by admin', 'lose'); return; }
    navigate('/' + g);
  };

  return (
    <div className="page-scroll">

      {/* Jackpot Banner */}
      <div className="jp-banner">
        <div className="jp-title">⚡ MEGA JACKPOT POOL ⚡</div>
        <div className="jp-amount">₹{jpAmt.toLocaleString()}</div>
        <div className="jp-sub">1 Coin = ₹1 &nbsp;•&nbsp; 100% Provably Fair</div>
      </div>

      {/* Daily Bonus */}
      <div className="daily-box">
        <div className="daily-left">
          <span style={{fontSize:22}}>🎁</span>
          <div>
            <div className="daily-title">Daily Bonus</div>
            <div className="daily-sub">Free 50 bonus coins every 24h</div>
          </div>
        </div>
        <button className="daily-claim-btn" onClick={handleDailyBonus} disabled={bonusClaiming}>
          {bonusClaiming ? '...' : 'CLAIM'}
        </button>
      </div>

      {/* Balance Row */}
      <div className="home-bal-row">
        <div className="home-bal-box">
          <div style={{fontSize:11,color:'#aaa',marginBottom:3}}>● REAL</div>
          <div style={{fontFamily:'Orbitron',fontSize:16,fontWeight:900,color:'var(--gold)'}}>₹{parseInt(coins).toLocaleString()}</div>
        </div>
        <div className="home-bal-box">
          <div style={{fontSize:11,color:'#aaa',marginBottom:3}}>🎁 BONUS (10% MAX)</div>
          <div style={{fontFamily:'Orbitron',fontSize:16,fontWeight:900,color:'var(--teal)'}}>🎁 {parseInt(bonus)}</div>
        </div>
      </div>

      {/* Games */}
      <div className="home-games-label">🎮 ALL GAMES</div>
      <div className="home-game-grid">
        {['aviator','slots','wingo','cards','jackpot'].map((g, i) => {
          const en = gameSettings[g] !== false;
          return (
            <div key={g} className={'game-card' + (en ? '' : ' disabled')} onClick={() => goGame(g)}>
              <span className="game-badge" style={{background: en ? BADGE_COLOR[g] : '#555'}}>
                {en ? GAME_BADGES[g] : 'OFF'}
              </span>
              <div className="gc-icon">{GAME_ICONS[g]}</div>
              <div className="gc-name" style={{color: en ? 'var(--gold)' : '#888'}}>{GAME_NAMES[g]}</div>
              <div className="gc-desc">{GAME_DESCS[g]}</div>
              <div className="gc-rate" style={{color: en ? 'var(--green)' : '#666'}}>{en ? GAME_RATES[g] : '🚫 Disabled'}</div>
            </div>
          );
        })}
      </div>

      {/* SEO Content Block (Hidden via comments per your local version) */}
      {/* <div className="seo-content" style={{ padding: '20px', color: '#888', fontSize: '11px', textAlign: 'center', background: '#1a1a1a', margin: '30px 15px', borderRadius: '8px', border: '1px solid #333' }}>
        <h2 style={{ fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>Best Online Casino & Color Prediction Game in India</h2>
        <p style={{ marginBottom: '8px', lineHeight: '1.4' }}>
          Welcome to <strong>Lucky Fortune Casino</strong>, India's most trusted and exciting online gaming platform. 
          Play top-rated games like <strong>Aviator</strong>, <strong>Wingo (Color Prediction)</strong>, Slots, and Daily Jackpot. 
          Experience fair gameplay with instant <strong>UPI and Bank withdrawals</strong>. 
        </p>
        <p style={{ marginBottom: '10px', lineHeight: '1.4' }}>
          Whether you are a beginner or a pro, Lucky Fortune gives you the best chance to play and win real cash daily. 
          Join the community of winners today! As featured on the <strong>prahlad Hacker</strong> gaming channel.
        </p>
        <p style={{ marginTop: '10px', fontSize: '9px', color: '#555' }}>
          Keywords: Aviator Game, Color Prediction, Wingo Winning Tricks, Instant Withdrawal Casino, Earn Money Online.
        </p>
      </div> 
      */}

    </div>
  );
}