import { useAuth, getDefaultAvatar } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ onAvatarClick, onPlusClick }) {
  const { user, coins, bonus, siteSettings } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const openTelegram = () => {
    if (!siteSettings.telegram_link) { showToast('📱 Support link set nahi hai', 'lose'); return; }
    window.open(siteSettings.telegram_link, '_blank');
  };

  const avatar = user?.avatar || getDefaultAvatar(user?.username || '');

  return (
    <div className="hdr">
      {/* Left: Avatar + Name */}
      <div className="hdr-left">
        <div className="hdr-av" onClick={onAvatarClick}>{avatar}</div>
        <div>
          <div className="hdr-name">{user?.is_admin ? '⚙️ ' + user?.username : user?.username}</div>
          <span className={`hdr-badge${user?.is_admin ? ' adm' : ''}`}>{user?.is_admin ? 'ADMIN' : 'VIP'}</span>
        </div>
      </div>

      {/* Center: Coins */}
      <div className="hdr-center">
        <div className="coins-box">
          🪙 <span>{parseInt(coins).toLocaleString()}</span>
          <div className="plus-btn" onClick={onPlusClick}>+</div>
        </div>
        <div className="bonus-box">🎁 Bonus: {parseInt(bonus).toLocaleString()}</div>
      </div>

      {/* Right: Telegram + Settings */}
      <div className="hdr-right">
        <div className="tg-btn" onClick={openTelegram}>
          <svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/></svg>
        </div>
        <div className="settings-btn" onClick={() => user?.is_admin ? navigate('/admin') : navigate('/profile')}>⚙️</div>
      </div>
    </div>
  );
}
