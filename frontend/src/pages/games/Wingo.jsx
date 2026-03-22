import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../api/axios';
import './Wingo.css';

export default function Wingo() {
  const navigate = useNavigate();
  const { applyCoins, gameSettings } = useAuth();
  const { showToast, confetti } = useUI();
  const [period, setPeriod] = useState('');
  const [secLeft, setSecLeft] = useState(120);
  const [sel, setSel] = useState({ type: null, value: null });
  const [betAmt, setBetAmt] = useState(50);
  const [hist, setHist] = useState([]);
  const [betting, setBetting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const timerRef = useRef(null);
  const periodRef = useRef('');

  useEffect(() => {
    initWingo();
    return () => clearInterval(timerRef.current);
  }, []);

  const initWingo = async () => {
    const d = await api.get('/games/wingo/period');
    if (!d?.success) return;
    setPeriod(d.period);
    periodRef.current = d.period;
    setSecLeft(d.seconds_left);
    startTimer(d.seconds_left, d.period);
    loadHist();
  };

  const startTimer = (sec, per) => {
    clearInterval(timerRef.current);
    let s = sec;
    timerRef.current = setInterval(async () => {
      s--;
      setSecLeft(Math.max(0, s));
      if (s <= 0) {
        clearInterval(timerRef.current);
        await resolveWingo(per);
        setTimeout(initWingo, 2000);
      }
    }, 1000);
  };

  const resolveWingo = async (per) => {
    const d = await api.post('/games/wingo/resolve', { period_number: per });
    if (!d?.success) return;
    // Show result
    setLastResult({ number: d.result_number, color: d.result_color, size: d.result_size });
    // Check if current user won
    if (d.bettor_ids && d.bettor_ids.length > 0) {
      confetti();
      showToast(`🏆 You WON! Result: #${d.result_number} ${d.result_color}`, 'win');
    } else {
      showToast(`Result: #${d.result_number} ${d.result_color} ${d.result_size}`, 'info');
    }
    // Refresh balance
    const bal = await api.get('/wallet/balance');
    if (bal?.success) applyCoins(bal);
    loadHist();
  };

  const loadHist = async () => {
    const d = await api.get('/games/wingo/history');
    if (d?.success) {
      // Map result_number/result_color/result_size → number/color/size
      const mapped = (d.history || []).map(h => ({
        number: h.result_number,
        color: h.result_color,
        size: h.result_size,
      }));
      setHist(mapped.slice(0, 10));
    }
  };

  const selBet = (type, value) => setSel({ type, value });

  const placeBet = async () => {
    if (!sel.type) { showToast('⚠️ Kuch select karo!', 'lose'); return; }
    if (secLeft < 5) { showToast('⏰ Betting closed!', 'lose'); return; }
    setBetting(true);
    const d = await api.post('/games/wingo/bet', {
      period_number: period,
      bet_type: sel.type,
      bet_value: sel.value,
      bet_amount: betAmt
    });
    setBetting(false);
    if (!d?.success) { showToast('❌ ' + (d?.message || 'Failed'), 'lose'); return; }
    applyCoins(d);
    showToast(`✅ Bet placed! ${sel.type}: ${sel.value} × 🪙${betAmt}`, 'win');
  };

  const mm = String(Math.floor(secLeft / 60)).padStart(2, '0');
  const ss = String(secLeft % 60).padStart(2, '0');
  const potential = sel.type === 'color' && sel.value === 'violet' ? betAmt * 5
    : sel.type === 'number' ? betAmt * 9
    : sel.type ? betAmt * 2 : 0;

  const isClosing = secLeft < 10;

  return (
    <div className="page-scroll">
      {gameSettings.wingo === false && <div className="disabled-msg">🚫 Wingo is currently disabled by admin.</div>}
      <div style={{ display: gameSettings.wingo === false ? 'none' : 'block' }}>
        <div className="game-bar">
          <button className="back-btn" onClick={() => navigate('/')}>← BACK</button>
          <div className="game-bar-title">🎨 Wingo Color</div>
        </div>

        {/* HTP */}
        <div className="htp-card">
          <div className="htp-header" onClick={e => { e.currentTarget.nextElementSibling.classList.toggle('open'); e.currentTarget.querySelector('.htp-arrow').classList.toggle('open'); }}>
            <div className="htp-title">📖 HOW TO PLAY</div><div className="htp-arrow">▼</div>
          </div>
          <div className="htp-body">
            <div className="htp-step"><div className="htp-num">1</div><div className="htp-text">Har <strong>2 minute</strong> mein new period — timer dekho</div></div>
            <div className="htp-step"><div className="htp-num">2</div><div className="htp-text"><strong>Color</strong> (Red/Green/Violet), <strong>Size</strong> (Small/Big), ya <strong>Number</strong> (0-9) choose karo</div></div>
            <div className="htp-step"><div className="htp-num">3</div><div className="htp-text">Bet amount select karo → <strong>PLACE BET</strong> dabao</div></div>
            <div className="htp-step"><div className="htp-num">4</div><div className="htp-text">Timer khatam → result aata hai → jeeto!</div></div>
            <div className="htp-prize">🏆 Red/Green=×2 | Violet=×5 | Small/Big=×2 | Number=×9</div>
          </div>
        </div>

        {/* Period + Timer */}
        <div className="wingo-hdr">
          <div style={{ fontSize: 9, color: '#ddd', letterSpacing: 3 }}>PERIOD</div>
          <div className="period-num">{period || 'Loading...'}</div>
          <div className="wingo-cd">
            <div className="cd-box" style={{ borderColor: isClosing ? 'rgba(255,34,68,.6)' : undefined }}>
              <div className="cd-num" style={{ color: isClosing ? 'var(--red)' : '#fff' }}>{mm}</div>
              <div className="cd-lbl">MIN</div>
            </div>
            <div className="cd-sep">:</div>
            <div className="cd-box" style={{ borderColor: isClosing ? 'rgba(255,34,68,.6)' : undefined }}>
              <div className="cd-num" style={{ color: isClosing ? 'var(--red)' : '#fff' }}>{ss}</div>
              <div className="cd-lbl">SEC</div>
            </div>
          </div>
          {isClosing && <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, marginTop: 4, animation: 'sepBlink .5s infinite' }}>⚠️ BETTING CLOSED</div>}
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="wingo-last-result">
            <span style={{ fontSize: 10, color: '#aaa', letterSpacing: 2 }}>LAST RESULT</span>
            <div className="wingo-result-ball" style={{
              background: lastResult.color === 'red' ? 'linear-gradient(135deg,#cc0022,#ff2244)'
                : lastResult.color === 'green' ? 'linear-gradient(135deg,#006622,#00aa33)'
                : 'linear-gradient(135deg,#660099,#9900cc)'
            }}>
              {lastResult.number}
            </div>
            <span style={{ fontSize: 11, color: '#ccc', textTransform: 'capitalize' }}>
              {lastResult.color} · {lastResult.size}
            </span>
          </div>
        )}

        {/* Bet Options */}
        <div className="card">
          <div className="wsec-lbl">— 🎨 COLOR —</div>
          <div className="wcolor-grid">
            {[['color', 'red', 'red-btn', '🔴', 'RED', '×2'], ['color', 'green', 'green-btn', '🟢', 'GREEN', '×2'], ['color', 'violet', 'violet-btn', '🟣', 'VIOLET', '×5']].map(([t, v, cls, e, n, m]) => (
              <button key={v} className={'wcolor-btn ' + cls + (sel.type === t && sel.value === v ? ' sel' : '')} onClick={() => selBet(t, v)}>
                <span className="ce">{e}</span><span className="cn">{n}</span><span className="cm">{m}</span>
              </button>
            ))}
          </div>
          <div className="wsec-lbl">— 📏 SIZE —</div>
          <div className="wsize-grid">
            {[['small', 'small-btn', '🔵', 'SMALL', '0–4 → ×2'], ['big', 'big-btn', '🟠', 'BIG', '5–9 → ×2']].map(([v, cls, e, n, sm]) => (
              <button key={v} className={'wsize-btn ' + cls + (sel.type === 'size' && sel.value === v ? ' sel' : '')} onClick={() => selBet('size', v)}>
                <span className="se">{e}</span><span className="sn">{n}</span><span className="sm">{sm}</span>
              </button>
            ))}
          </div>
          <div className="wsec-lbl">— 🔢 NUMBER —</div>
          <div className="wnum-grid">
            {[...Array(10)].map((_, i) => {
              const bg = i === 0 || i === 5 ? 'linear-gradient(135deg,#330066,#660099)'
                : i % 2 === 0 ? 'linear-gradient(135deg,#8b0000,#cc0022)'
                : 'linear-gradient(135deg,#004400,#006622)';
              return (
                <div key={i} className={'wnum-btn' + (sel.type === 'number' && sel.value === String(i) ? ' sel' : '')}
                  style={{ background: bg }} onClick={() => selBet('number', String(i))}>{i}</div>
              );
            })}
          </div>
        </div>

        {/* Bet Amount */}
        <div className="card">
          <div className="wsec-lbl" style={{ textAlign: 'left', marginBottom: 7 }}>BET AMOUNT</div>
          <div className="bet-chips">
            {[10, 50, 100, 500].map(v => (
              <div key={v} className={'bchip' + (betAmt === v ? ' sel' : '')} onClick={() => setBetAmt(v)}>₹{v}</div>
            ))}
          </div>
          <div className="wsel-info">
            Selected: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{sel.type ? `${sel.type}: ${sel.value}` : 'None'}</span><br />
            Bet: 🪙<span style={{ color: 'var(--gold)', fontWeight: 700 }}>{betAmt}</span>
            &nbsp;|&nbsp; Win: 🪙<span style={{ color: 'var(--green)', fontWeight: 700 }}>{potential}</span>
          </div>
          <button className="place-btn" onClick={placeBet} disabled={betting || secLeft < 5}>
            {secLeft < 5 ? '⏰ CLOSED' : betting ? 'PLACING...' : '🎯 PLACE BET'}
          </button>
        </div>

        {/* Recent Results */}
        {hist.length > 0 && (
          <div className="card">
            <div className="card-title">📊 RECENT RESULTS</div>
            <div className="hist-row">
              {hist.map((h, i) => (
                <div key={i} className={'hball ' + (h.color || 'red')}>
                  <span className="hn">{h.number}</span>
                  <span className="hs">{h.size ? h.size[0].toUpperCase() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
