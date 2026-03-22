import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AVATARS = ['🎰','🃏','💎','🎲','🎯','🏆','👑','🦁','🐯','🦊','🐺','🦅','🐉','🦄','🔥','⚡','🌟','💫','🎭','🎪','🤑','💰','🎮','🕹️','🧿','🎱','🎀','🦋','🌈','🎸'];

export function getDefaultAvatar(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) % AVATARS.length;
  return AVATARS[Math.abs(hash)];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gameSettings, setGameSettings] = useState({ aviator:true, slots:true, wingo:true, cards:true, jackpot:true });
  const [siteSettings, setSiteSettings] = useState({ upi_id:'', site_url:window.location.origin, telegram_link:'' });

  const applyCoins = useCallback((data) => {
    if (data?.coins !== undefined) {
      setCoins(data.coins);
      setBonus(data.bonus_coins || 0);
      if (data.withdrawable_coins !== undefined) setWithdrawable(data.withdrawable_coins);
    }
  }, []);

  const loginOK = useCallback(async (userData) => {
    setUser(userData);
    setCoins(userData.coins || 0);
    setBonus(userData.bonus_coins || 0);
    setWithdrawable(userData.withdrawable_coins || 0);
    const av = userData.avatar || getDefaultAvatar(userData.username);
    if (!userData.avatar) api.put('/auth/profile', { username: userData.username, email: userData.email, avatar: av });
    const gs = await api.get('/games/status');
    if (gs?.success) setGameSettings({ aviator:true, slots:true, wingo:true, cards:true, jackpot:true, ...gs.settings });
    const ps = await api.get('/admin/payment-settings');
    if (ps?.success) setSiteSettings(ps.settings);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lf_tok');
    setUser(null); setCoins(0); setBonus(0); setWithdrawable(0);
  }, []);

  const refreshSettings = useCallback(async () => {
    const gs = await api.get('/games/status');
    if (gs?.success) setGameSettings({ aviator:true, slots:true, wingo:true, cards:true, jackpot:true, ...gs.settings });
  }, []);

  return (
    <AuthContext.Provider value={{ user, coins, bonus, withdrawable, loading, setLoading, gameSettings, setGameSettings, siteSettings, setSiteSettings, loginOK, logout, applyCoins, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
