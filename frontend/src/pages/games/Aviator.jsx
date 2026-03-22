import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import api from '../../api/axios';
import './Aviator.css';

export default function Aviator() {
  const navigate = useNavigate();
  const { applyCoins, gameSettings } = useAuth();
  const { showToast, showModal, confetti } = useUI();
  const canvasRef = useRef(null);
  const avRef = useRef({ flying:false, crashed:false, sessionId:null, crashAt:1, bet:50, mult:1, cashed:false, startTime:0, rafId:null, graphPoints:[] });
  const [bet, setBet] = useState(50);
  const [autoCash, setAutoCash] = useState('');
  const [autoOn, setAutoOn] = useState(false);
  const autoOnRef = useRef(false);
  const autoCashRef = useRef('');
  useEffect(() => { autoOnRef.current = autoOn; }, [autoOn]);
  useEffect(() => { autoCashRef.current = autoCash; }, [autoCash]);

  const [histPills, setHistPills] = useState([{v:1.23,c:'low'},{v:3.45,c:'mid'},{v:8.9,c:'high'},{v:1.02,c:'low'},{v:24.5,c:'mega'}]);
  const [multDisp, setMultDisp] = useState('WAITING...');
  const [multClass, setMultClass] = useState('waiting');
  const [flying, setFlying] = useState(false);
  const [cashed, setCashed] = useState(false);
  const [statBar, setStatBar] = useState(false);
  const [htpOpen, setHtpOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => initCanvas(), 80);
    loadHistory();
    return () => { if (avRef.current.rafId) cancelAnimationFrame(avRef.current.rafId); };
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap?.offsetWidth) { setTimeout(initCanvas, 150); return; }
    canvas.width = wrap.offsetWidth;
    canvas.height = 200;
    drawIdle(canvas);
  };

  const loadHistory = async () => {
    const d = await api.get('/games/aviator/history');
    if (d?.success && d.history?.length)
      setHistPills(d.history.slice(0,8).map(v => ({ v, c: v<2?'low':v<5?'mid':v<20?'high':'mega' })));
  };

  const drawGrid = (ctx, W, H) => {
    ctx.strokeStyle = 'rgba(100,80,255,0.07)'; ctx.lineWidth = 1;
    for (let i=0;i<=5;i++) {
      const y=(H/5)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      const x=(W/5)*i; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    ctx.strokeStyle='rgba(100,80,255,0.2)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,H-1); ctx.lineTo(W,H-1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1,0); ctx.lineTo(1,H); ctx.stroke();
  };

  const drawPlane = (ctx, x, y, angle, crashed) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    if (crashed) {
      ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85; ctx.fillText('💥', 0, 0);
    } else {
      // Flame trail first (behind plane)
      const flameColors = ['rgba(255,220,50,0.9)','rgba(255,130,20,0.75)','rgba(255,60,0,0.55)','rgba(180,30,0,0.3)'];
      for (let i = 0; i < 5; i++) {
        const fx = -22 - i * 9 + (Math.random()-0.5)*3;
        const fy = (Math.random()-0.5)*5;
        const r = Math.max(1, 5 - i * 0.8);
        ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI*2);
        ctx.fillStyle = flameColors[Math.min(i, 3)]; ctx.fill();
      }

      // Plane shadow/glow
      ctx.shadowColor = '#00ffaa'; ctx.shadowBlur = 16;

      // Main fuselage
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.moveTo(26, 0);        // nose
      ctx.bezierCurveTo(20,-5, 0,-6, -18,-4);
      ctx.bezierCurveTo(-22,-3, -22,3, -18,4);
      ctx.bezierCurveTo(0,6, 20,5, 26,0);
      ctx.fill();

      // Cockpit window
      ctx.fillStyle = '#88ccff';
      ctx.beginPath();
      ctx.ellipse(14, -1, 5, 3, -0.2, 0, Math.PI*2);
      ctx.fill();

      // Main wing
      ctx.fillStyle = '#c8dff0';
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(2, -22);
      ctx.lineTo(-6, -22);
      ctx.lineTo(-4, -4);
      ctx.closePath(); ctx.fill();

      // Wing highlight
      ctx.fillStyle = '#e0eefa';
      ctx.beginPath();
      ctx.moveTo(4, -4);
      ctx.lineTo(1, -18);
      ctx.lineTo(-2, -18);
      ctx.lineTo(-2, -4);
      ctx.closePath(); ctx.fill();

      // Tail fin
      ctx.fillStyle = '#c8dff0';
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.lineTo(-12, -14);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-8, -4);
      ctx.closePath(); ctx.fill();

      // Small stabilizer
      ctx.fillStyle = '#b8cfe0';
      ctx.beginPath();
      ctx.moveTo(-16, 4);
      ctx.lineTo(-14, 10);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-10, 4);
      ctx.closePath(); ctx.fill();

      // Engine pod
      ctx.fillStyle = '#aabbcc';
      ctx.beginPath();
      ctx.ellipse(-2, 8, 6, 3, 0.1, 0, Math.PI*2);
      ctx.fill();

      // Engine glow
      ctx.fillStyle = 'rgba(255,180,50,0.8)';
      ctx.beginPath(); ctx.arc(-8, 8, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  };

  const drawIdle = (canvas) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H); drawGrid(ctx,W,H);
    drawPlane(ctx, 40, H-40, -0.15, false);
    // Waiting text
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '13px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for next round...', W/2, H/2);
  };

  const handleCrashFn = useCallback(async () => {
    const av = avRef.current;
    av.flying = false; av.crashed = true;
    if (av.rafId) cancelAnimationFrame(av.rafId);
    setFlying(false); setStatBar(false);
    setMultDisp('CRASHED!'); setMultClass('crashed');
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d'), W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H); drawGrid(ctx,W,H);
      if (av.graphPoints.length>1) {
        ctx.strokeStyle='rgba(255,34,68,0.7)'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(av.graphPoints[0].x, av.graphPoints[0].y);
        av.graphPoints.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.stroke();
      }
      const last = av.graphPoints[av.graphPoints.length-1] || {x:W/2, y:H/2};
      drawPlane(ctx, last.x, last.y, 0, true);
    }
    if (!av.cashed && av.sessionId) {
      const d = await api.post('/games/aviator/crash', { session_id: av.sessionId });
      if (d) applyCoins(d);
    }
    showToast(`💥 Crashed at ${av.crashAt.toFixed(2)}x!`, 'lose');
    setHistPills(p => [{v:av.crashAt, c:av.crashAt<2?'low':av.crashAt<5?'mid':av.crashAt<20?'high':'mega'}, ...p.slice(0,7)]);
    setTimeout(() => {
      setMultDisp('WAITING...'); setMultClass('waiting');
      if (canvasRef.current) drawIdle(canvasRef.current);
    }, 3000);
  }, [applyCoins, showToast]);

  const doActualCashOut = useCallback(async () => {
    const av = avRef.current;
    if (!av.flying || av.cashed) return;
    av.cashed = true; av.flying = false;
    if (av.rafId) cancelAnimationFrame(av.rafId);
    const mult = parseFloat(av.mult.toFixed(2));
    const d = await api.post('/games/aviator/cashout', { session_id: av.sessionId, multiplier: mult });
    if (!d?.success) { showToast('❌ '+(d?.message||'Failed'), 'lose'); av.cashed=false; av.flying=true; return; }
    applyCoins(d);
    setFlying(false); setCashed(true); setStatBar(false);
    setMultDisp(mult.toFixed(2)+'x'); setMultClass('win');
    confetti();
    showModal('✈️','CASHED OUT!',`${mult.toFixed(2)}x pe cash out kiya!`,`+🪙${d.win_amount.toLocaleString()}`);
    setTimeout(() => { setCashed(false); setMultDisp('WAITING...'); setMultClass('waiting'); if(canvasRef.current) drawIdle(canvasRef.current); }, 4000);
  }, [applyCoins, showToast, showModal, confetti]);

  const animate = useCallback(() => {
    const av = avRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !av.flying) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const elapsed = (Date.now() - av.startTime) / 1000;

    // Faster realistic growth - real Aviator speed
    // Starts slow then accelerates - like real game
    const mult = Math.max(1.00, 1 + elapsed * 0.4 + Math.pow(elapsed * 0.18, 2));
    av.mult = mult;

    if (autoOnRef.current && autoCashRef.current && mult >= parseFloat(autoCashRef.current) && !av.cashed) {
      doActualCashOut(); return;
    }
    if (mult >= av.crashAt) { handleCrashFn(); return; }

    setMultDisp(mult.toFixed(2)+'x');
    setMultClass(mult<2?'low':mult<5?'mid':mult<10?'high':'mega');

    // Graph: smooth exponential curve
    const progress = Math.min((mult - 1) / (av.crashAt - 1 + 0.01), 0.95);
    const rx = 35 + progress * (W - 80);
    const ry = H - 35 - progress * (H - 70);
    av.graphPoints.push({x:rx, y:ry});
    if (av.graphPoints.length > 300) av.graphPoints.shift();

    ctx.clearRect(0,0,W,H); drawGrid(ctx,W,H);

    // Draw filled curve
    if (av.graphPoints.length > 1) {
      const grad = ctx.createLinearGradient(0,H,W,0);
      grad.addColorStop(0,'rgba(0,255,150,0.5)');
      grad.addColorStop(1,'rgba(0,220,255,0.8)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(av.graphPoints[0].x, av.graphPoints[0].y);
      av.graphPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      // Fill
      ctx.beginPath(); ctx.moveTo(35, H-1);
      av.graphPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(av.graphPoints[av.graphPoints.length-1].x, H-1);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0,0,0,H);
      fill.addColorStop(0,'rgba(0,255,150,0.12)');
      fill.addColorStop(1,'rgba(0,255,150,0)');
      ctx.fillStyle = fill; ctx.fill();
    }

    // Plane angle
    const pts = av.graphPoints;
    let angle = -0.3;
    if (pts.length > 3) {
      const dx = rx - pts[pts.length-3].x;
      const dy = ry - pts[pts.length-3].y;
      angle = Math.atan2(dy, dx) * 0.6;
    }
    drawPlane(ctx, rx, ry, angle, false);

    // Update stat elements
    const win = Math.floor(av.bet * mult);
    const md = document.getElementById('avMultDisp'); if(md) md.textContent = mult.toFixed(2)+'x';
    const wd = document.getElementById('avWinDisp'); if(wd) wd.textContent = '🪙'+win.toLocaleString();
    const ca = document.getElementById('avCashAmt'); if(ca) ca.textContent = '🪙'+win.toLocaleString();

    av.rafId = requestAnimationFrame(animate);
  }, [handleCrashFn, doActualCashOut]);

  const doFly = async () => {
    if (avRef.current.flying) return;
    if (gameSettings.aviator === false) { showToast('🚫 Aviator disabled', 'lose'); return; }
    const d = await api.post('/games/aviator/start', { bet_amount: bet });
    if (!d?.success) { showToast('❌ '+(d?.message||'Failed'), 'lose'); return; }
    applyCoins(d);
    avRef.current = { flying:true, crashed:false, sessionId:d.session_id, crashAt:d.crash_at, bet, mult:1, cashed:false, startTime:Date.now(), rafId:null, graphPoints:[] };
    setFlying(true); setCashed(false);
    setMultDisp('1.00x'); setMultClass('low');
    setStatBar(true);
    const bd = document.getElementById('avBetDisp'); if(bd) bd.textContent = '🪙'+bet.toLocaleString();
    avRef.current.rafId = requestAnimationFrame(animate);
  };

  const pillColor = (c) => c==='low'?'#ff6688':c==='mid'?'var(--gold)':c==='high'?'var(--teal)':'#cc66ff';

  return (
    <div className="av-page">
      {gameSettings.aviator===false && <div className="disabled-msg">🚫 Aviator is currently disabled.</div>}
      <div className="av-wrap" style={{display:gameSettings.aviator===false?'none':'flex'}}>

        {/* Topbar */}
        <div className="av-topbar">
          <button className="back-btn" onClick={()=>navigate('/')}>← BACK</button>
          <div className="av-topbar-title">✈️ AVIATOR</div>
          <div className="av-live"><div className="av-live-dot"></div>LIVE</div>
        </div>

        {/* How to Play */}
        <div className="av-htp">
          <div className="av-htp-header" onClick={()=>setHtpOpen(o=>!o)}>
            <span>📖 HOW TO PLAY</span>
            <span style={{transition:'transform .3s',display:'inline-block',transform:htpOpen?'rotate(180deg)':'none'}}>▼</span>
          </div>
          {htpOpen && (
            <div className="av-htp-body">
              <div className="htp-step"><div className="htp-num">1</div><div className="htp-text">Bet amount set karo aur <strong>FLY</strong> dabao — plane uda!</div></div>
              <div className="htp-step"><div className="htp-num">2</div><div className="htp-text">Multiplier badhta rahega — <strong>1.00x → 2x → 10x → 100x</strong></div></div>
              <div className="htp-step"><div className="htp-num">3</div><div className="htp-text">Plane crash hone se pehle <strong>CASH OUT</strong> dabao!</div></div>
              <div className="htp-step"><div className="htp-num">4</div><div className="htp-text">Crash ke baad cash out nahi hua → <strong>poora bet lost!</strong></div></div>
              <div className="htp-prize">💡 Auto Cashout use karo risk kam karne ke liye! Max 100x possible!</div>
            </div>
          )}
        </div>

        {/* History pills */}
        <div className="av-hist-bar">
          {histPills.map((p,i) => (
            <span key={i} className={'av-hpill '+p.c} style={{color:pillColor(p.c)}}>
              {typeof p.v === 'number' ? p.v.toFixed(2) : p.v}x
            </span>
          ))}
        </div>

        {/* Canvas */}
        <div className="av-canvas-wrap">
          <canvas ref={canvasRef}></canvas>
          <div className="av-mult-display">
            <div className={'av-mult-num '+multClass}>{multDisp}</div>
          </div>
        </div>

        {/* Stat bar */}
        {statBar && (
          <div className="av-stat-bar">
            <div className="av-stat-item"><div className="av-stat-v" id="avBetDisp">🪙{bet}</div><div className="av-stat-l">BET</div></div>
            <div className="av-stat-item"><div className="av-stat-v" id="avMultDisp" style={{color:'#00ff99'}}>1.00x</div><div className="av-stat-l">MULTIPLIER</div></div>
            <div className="av-stat-item"><div className="av-stat-v" id="avWinDisp" style={{color:'#ffc107'}}>🪙0</div><div className="av-stat-l">CURRENT WIN</div></div>
          </div>
        )}

        {/* Panel */}
        <div className="av-panel">
          <div className="av-bet-row">
            <div className="av-bet-lbl">BET</div>
            <div className="av-chips">
              {[50,100,500,1000].map(v=>(
                <div key={v} className={'av-chip'+(bet===v&&!flying?' sel':'')}
                  onClick={()=>{if(!flying){setBet(v);avRef.current.bet=v;}}}>
                  {v>=1000?v/1000+'K':v}
                </div>
              ))}
            </div>
            <input className="av-bet-inp" type="number" value={bet} min="10" max="5000"
              onChange={e=>{if(!flying){const n=Math.max(10,Math.min(5000,parseInt(e.target.value)||10));setBet(n);avRef.current.bet=n;}}} />
          </div>
          <div className="av-auto-row">
            <div className="av-auto-lbl">AUTO CASHOUT AT</div>
            <input className="av-auto-inp" type="number" placeholder="e.g. 2.00" step="0.1" min="1.1"
              value={autoCash} onChange={e=>setAutoCash(e.target.value)} />
            <input type="checkbox" id="autoChk" className="av-auto-check" checked={autoOn} onChange={e=>setAutoOn(e.target.checked)} />
            <label htmlFor="autoChk" style={{fontSize:9,color:'#aaa',fontFamily:'Orbitron'}}>ON</label>
          </div>
          <div className="av-btns">
            <button className="av-cash-btn" onClick={doActualCashOut} disabled={!flying||cashed}>
              CASH OUT<br/><span id="avCashAmt" style={{fontSize:13,fontWeight:900}}>🪙0</span>
            </button>
            <button className="av-go-btn" onClick={doFly} disabled={flying}>
              {flying?'✈️ FLYING...':'✈️ FLY'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
