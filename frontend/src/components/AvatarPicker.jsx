import { AVATARS } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../api/axios';

export default function AvatarPicker({ show, onClose }) {
  const { user, loginOK } = useAuth();
  const { showToast } = useUI();
  const curAv = user?.avatar || '';

  const selectAvatar = async (av) => {
    const d = await api.put('/auth/profile', { username: user.username, email: user.email, avatar: av });
    if (!d?.success) { showToast('❌ Failed', 'lose'); return; }
    // Refresh user
    const pd = await api.get('/auth/profile');
    if (pd?.success) loginOK(pd.user);
    showToast('✅ Avatar updated!', 'win');
    setTimeout(onClose, 500);
  };

  return (
    <div className={`av-picker-overlay${show ? ' show' : ''}`} onClick={onClose}>
      <div className="av-picker-box" onClick={e => e.stopPropagation()}>
        <div className="av-picker-title">CHOOSE AVATAR</div>
        <div className="av-grid">
          {AVATARS.map(av => (
            <div key={av} className={`av-opt${av === curAv ? ' selected' : ''}`} onClick={() => selectAvatar(av)}>{av}</div>
          ))}
        </div>
        <button className="av-picker-close" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
