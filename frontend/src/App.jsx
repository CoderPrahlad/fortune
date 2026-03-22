import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api/axios';

import Auth from './pages/Auth';
import Home from './pages/Home';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';
import Refer from './pages/Refer';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Aviator from './pages/games/Aviator';
import Slots from './pages/games/Slots';
import Wingo from './pages/games/Wingo';
import Cards from './pages/games/Cards';
import Jackpot from './pages/games/Jackpot';

import Header from './components/Header';
import TabBar from './components/TabBar';
import AvatarPicker from './components/AvatarPicker';

function Particles() {
  useEffect(() => {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({length:30},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*2+0.5,vx:(Math.random()-0.5)*0.3,vy:-Math.random()*0.5-0.1,o:Math.random()}));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p=>{
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,215,0,${p.o*0.4})`;ctx.fill();
        p.x+=p.vx;p.y+=p.vy;p.o+=0.005*(Math.random()>0.5?1:-1);
        if(p.y<0)p.y=canvas.height;if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;
        p.o=Math.max(0.05,Math.min(0.6,p.o));
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas id="particles"></canvas>;
}

function MainLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avShow, setAvShow] = useState(false);
  
  const handleAvatarClick = () => {
    if (user?.is_admin) navigate('/admin');
    else setAvShow(true);
  };

  return (
    <>
      <Particles />
      <Header onAvatarClick={handleAvatarClick} onPlusClick={() => navigate('/wallet', { state: { openDeposit: true } })} />
      <AvatarPicker show={avShow} onClose={() => setAvShow(false)} />
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',position:'relative',zIndex:1}}>
        {children}
      </div>
      <TabBar />
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loginOK, loading, setLoading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const autoLogin = async () => {
      const tok = localStorage.getItem('lf_tok');
      if (!tok) { setChecked(true); return; }
      setLoading(true);
      const d = await api.get('/auth/profile');
      if (d?.success) await loginOK(d.user);
      setLoading(false);
      setChecked(true);
    };
    autoLogin();
  }, []);

  if (!checked) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',background:'#040a04'}}>
        <span style={{fontSize:64,animation:'coinSpin 1.5s ease-in-out infinite'}}>🪙</span>
        <div style={{fontFamily:'Orbitron',color:'var(--gold)',marginTop:16,letterSpacing:4,fontSize:13}}>LOADING...</div>
        <style>{`@keyframes coinSpin{0%,100%{transform:rotateY(0) scale(1)}50%{transform:rotateY(180deg) scale(1.1)}}`}</style>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/history" element={<History />} />
        <Route path="/ranks" element={<Leaderboard />} />
        <Route path="/refer" element={<Refer />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/aviator" element={<Aviator />} />
        <Route path="/slots" element={<Slots />} />
        <Route path="/wingo" element={<Wingo />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/jackpot" element={<Jackpot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default AppRoutes;
