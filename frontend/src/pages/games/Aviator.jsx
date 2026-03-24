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
  const avRef = useRef({ flying:false, crashed:false, sessionId:null, crashAt:1, bet:50, mult:1, cashed:false, startTime:0, rafId:null, graphPoints:[], flyAwayProgress: 0 });
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
    canvas.height = 250; // Thodi height badha di realistic feel ke liye
    drawIdle(canvas);
  };

  const loadHistory = async () => {
    const d = await api.get('/games/aviator/history');
    if (d?.success && d.history?.length)
      setHistPills(d.history.slice(0,8).map(v => ({ v, c: v<2?'low':v<5?'mid':v<20?'high':'mega' })));
  };

  // ✅ REALISTIC MOVING GRID
  const drawGrid = (ctx, W, H, elapsed = 0) => {
    ctx.fillStyle = '#0a0a0a'; // Dark background
    ctx.fillRect(0, 0, W, H);
    
    const speedX = 40; 
    const speedY = 15;
    const offsetX = (elapsed * speedX) % (W/6);
    const offsetY = (elapsed * speedY) % (H/5);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; 
    ctx.lineWidth = 1;
    
    // Vertical lines moving left
    for (let x = -offsetX; x <= W; x += W/6) {
      if(x < 0) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // Horizontal lines moving down
    for (let y = H + offsetY; y >= 0; y -= H/5) {
      if(y > H) continue;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H-2); ctx.lineTo(W, H-2); ctx.stroke(); // Bottom Axis
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, H); ctx.stroke(); // Left Axis
  };

  // ✅ CLASSIC RED PLANE DESIGN
  const drawPlane = (ctx, x, y, angle) => {
    ctx.save(); 
    ctx.translate(x, y); 
    ctx.rotate(angle);

    // Propeller blur
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(32, 0, 2, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 15;

    // Plane Body (Red)
    ctx.fillStyle = '#e60026'; // Classic Aviator Red
    ctx.beginPath();
    ctx.moveTo(30, 0); 
    ctx.bezierCurveTo(25,-6, 0,-8, -20,-4);
    ctx.bezierCurveTo(-25,-2, -25,2, -20,4);
    ctx.bezierCurveTo(0,8, 25,6, 30,0);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(10, -3, 6, 2.5, -0.1, 0, Math.PI*2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#b3001c'; // Darker red for wing
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(-5, -25);
    ctx.lineTo(-12, -25);
    ctx.lineTo(-5, -4);
    ctx.closePath(); ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.lineTo(-18, -15);
    ctx.lineTo(-22, -15);
    ctx.lineTo(-20, -4);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  };

  const drawIdle = (canvas) => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    drawGrid(ctx, W, H, 0);
    drawPlane(ctx, 40, H-40, -0.15);
    
    // Modern Waiting Text
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 20px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WAITING FOR NEXT ROUND...', W/2, H/2);
  };

  // ✅ FLEW AWAY CRASH ANIMATION
  const animateCrash = useCallback(() => {
    const av = avRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    av.flyAwayProgress += 0.05; // speed of flying away
    const p = av.flyAwayProgress;

    ctx.clearRect(0,0,W,H); 
    drawGrid(ctx, W, H, 0);

    // Draw previous curve but fading out
    if (av.graphPoints.length > 1) {
      ctx.strokeStyle = `rgba(230,0,38,${Math.max(0, 0.8 - p)})`; 
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(av.graphPoints[0].x, av.graphPoints[0].y);
      av.graphPoints.forEach(pt => ctx.lineTo(pt.x, pt.y)); 
      ctx.stroke();
    }

    // "FLEW AWAY!" Text exactly like real game
    ctx.fillStyle = '#e60026';
    ctx.font = '900 32px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLEW AWAY!', W/2, H/2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '900 40px "Orbitron", sans-serif';
    ctx.fillText(`${av.crashAt.toFixed(2)}x`, W/2, H/2 + 25);

    // Plane flying rapidly to top right
    const last = av.graphPoints[av.graphPoints.length-1] || {x:W/2, y:H/2};
    const flyX = last.x + (p * 500);
    const flyY = last.y - (p * 300);
    drawPlane(ctx, flyX, flyY, -0.5);

    if (p < 2) {
      av.rafId = requestAnimationFrame(animateCrash);
    }
  }, []);

  const handleCrashFn = useCallback(async () => {
    const av = avRef.current;
    av.flying = false; av.crashed = true;
    if (av.rafId) cancelAnimationFrame(av.rafId);
    
    setFlying(false); setStatBar(false);
    setMultDisp(`FLEW AWAY!`); setMultClass('crashed');
    
    av.flyAwayProgress = 0;
    av.rafId = requestAnimationFrame(animateCrash);

    if (!av.cashed && av.sessionId) {
      const d = await api.post('/games/aviator/crash', { session_id: av.sessionId });
      if (d) applyCoins(d);
    }
    setHistPills(p => [{v:av.crashAt, c:av.crashAt<2?'low':av.crashAt<5?'mid':av.crashAt<20?'high':'mega'}, ...p.slice(0,7)]);
    
    setTimeout(() => {
      setMultDisp('WAITING...'); setMultClass('waiting');
      if (canvasRef.current) drawIdle(canvasRef.current);
    }, 3500);
  }, [applyCoins, animateCrash]);

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
    showModal('✈️','CASHED OUT!',`You grabbed ${mult.toFixed(2)}x!`,`+🪙${d.win_amount.toLocaleString()}`);
    
    setTimeout(() => { setCashed(false); setMultDisp('WAITING...'); setMultClass('waiting'); if(canvasRef.current) drawIdle(canvasRef.current); }, 4000);
  }, [applyCoins, showToast, showModal, confetti]);

  const animate = useCallback(() => {
    const av = avRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !av.flying) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const elapsed = (Date.now() - av.startTime) / 1000;

    const mult = Math.max(1.00, 1 + elapsed * 0.4 + Math.pow(elapsed * 0.18, 2));
    av.mult = mult;

    if (autoOnRef.current && autoCashRef.current && mult >= parseFloat(autoCashRef.current) && !av.cashed) {
      doActualCashOut(); return;
    }
    if (mult >= av.crashAt) { handleCrashFn(); return; }

    setMultDisp(mult.toFixed(2)+'x');
    setMultClass(mult<2?'low':mult<5?'mid':mult<10?'high':'mega');

    // Smooth curve
    const progress = Math.min((mult - 1) / (av.crashAt - 1 + 0.01), 0.95);
    const rx = 40 + progress * (W - 100);
    const ry = H - 40 - progress * (H - 90);
    av.graphPoints.push({x:rx, y:ry});
    if (av.graphPoints.length > 300) av.graphPoints.shift();

    ctx.clearRect(0,0,W,H); 
    drawGrid(ctx, W, H, elapsed); // Moving grid!

    // Red Curve Gradient
    if (av.graphPoints.length > 1) {
      ctx.strokeStyle = '#e60026'; 
      ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(av.graphPoints[0].x, av.graphPoints[0].y);
      av.graphPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Red Fill Below Curve
      ctx.beginPath(); ctx.moveTo(40, H-2);
      av.graphPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(av.graphPoints[av.graphPoints.length-1].x, H-2);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0,0,0,H);
      fill.addColorStop(0,'rgba(230,0,38,0.3)');
      fill.addColorStop(1,'rgba(230,0,38,0.0)');
      ctx.fillStyle = fill; ctx.fill();
    }

    // Plane angle logic
    const pts = av.graphPoints;
    let angle = -0.2;
    if (pts.length > 5) {
      const dx = rx - pts[pts.length-5].x;
      const dy = ry - pts[pts.length-5].y;
      angle = Math.atan2(dy, dx) * 0.8;
    }
    drawPlane(ctx, rx, ry, angle);

    // Update HTML stats
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
    avRef.current = { flying:true, crashed:false, sessionId:d.session_id, crashAt:d.crash_at, bet, mult:1, cashed:false, startTime:Date.now(), rafId:null, graphPoints:[], flyAwayProgress:0 };
    setFlying(true); setCashed(false);
    setMultDisp('1.00x'); setMultClass('low');
    setStatBar(true);
    
    const bd = document.getElementById('avBetDisp'); if(bd) bd.textContent = '🪙'+bet.toLocaleString();
    avRef.current.rafId = requestAnimationFrame(animate);
  };

  const pillColor = (c) => c==='low'?'#ff4d4d':c==='mid'?'#ffcc00':c==='high'?'#00e676':'#d500f9';

  return (
    <div className="av-page">
      {gameSettings.aviator===false && <div className="disabled-msg">🚫 Aviator is currently disabled.</div>}
      <div className="av-wrap" style={{display:gameSettings.aviator===false?'none':'flex'}}>

        <div className="av-topbar">
          <button className="back-btn" onClick={()=>navigate('/')}>← BACK</button>
          <div className="av-topbar-title" style={{color:'#e60026', fontWeight:900, fontSize:'20px'}}>✈️ AVIATOR</div>
          <div className="av-live"><div className="av-live-dot" style={{backgroundColor:'#e60026'}}></div>LIVE</div>
        </div>

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
              <div className="htp-prize" style={{color:'#ffcc00'}}>💡 Auto Cashout use karo risk kam karne ke liye! Max 100x possible!</div>
            </div>
          )}
        </div>

        <div className="av-hist-bar">
          {histPills.map((p,i) => (
            <span key={i} className={'av-hpill '+p.c} style={{color:pillColor(p.c), border:`1px solid ${pillColor(p.c)}`}}>
              {typeof p.v === 'number' ? p.v.toFixed(2) : p.v}x
            </span>
          ))}
        </div>

        <div className="av-canvas-wrap" style={{border: '2px solid #333', borderRadius: '12px', overflow: 'hidden'}}>
          <canvas ref={canvasRef}></canvas>
          <div className="av-mult-display">
            <div className={'av-mult-num '+multClass} style={{textShadow: multDisp.includes('AWAY') ? 'none' : '0 0 20px rgba(255,255,255,0.2)'}}>{multDisp}</div>
          </div>
        </div>

        {statBar && (
          <div className="av-stat-bar" style={{background:'#1a1a1a', borderTop:'2px solid #e60026'}}>
            <div className="av-stat-item"><div className="av-stat-v" id="avBetDisp">🪙{bet}</div><div className="av-stat-l">BET</div></div>
            <div className="av-stat-item"><div className="av-stat-v" id="avMultDisp" style={{color:'#fff'}}>1.00x</div><div className="av-stat-l" style={{color:'#e60026'}}>MULTIPLIER</div></div>
            <div className="av-stat-item"><div className="av-stat-v" id="avWinDisp" style={{color:'#ffcc00'}}>🪙0</div><div className="av-stat-l">CURRENT WIN</div></div>
          </div>
        )}

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
            <button className="av-cash-btn" style={{background: cashed ? '#666' : '#ff9900', color:'#000'}} onClick={doActualCashOut} disabled={!flying||cashed}>
              CASH OUT<br/><span id="avCashAmt" style={{fontSize:15,fontWeight:900}}>🪙0</span>
            </button>
            <button className="av-go-btn" style={{background: flying ? '#333' : '#e60026'}} onClick={doFly} disabled={flying}>
              {flying?'✈️ FLYING...':'BET 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}