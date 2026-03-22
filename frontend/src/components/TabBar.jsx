import { useNavigate, useLocation } from 'react-router-dom';
import './TabBar.css';

const TABS = [
  { path: '/', label: 'HOME', icon: '🏠' },
  { path: '/wallet', label: 'WALLET', icon: '💳' },
  { path: '/history', label: 'HISTORY', icon: '📜' },
  { path: '/ranks', label: 'RANKS', icon: '🏆' },
  { path: '/refer', label: 'REFER', icon: '👥' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="tabbar">
      {TABS.map(tab => (
        <div
          key={tab.path}
          className={`tabbar-item${location.pathname === tab.path ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="tabbar-icon">{tab.icon}</span>
          <span className="tabbar-label">{tab.label}</span>
        </div>
      ))}
    </div>
  );
}
