import type { Role } from '../config/navigation';

interface TopbarProps {
  currentRole: Role;
  onSetRole: (role: Role) => void;
  offline: boolean;
  onToggleOffline: () => void;
  userName: string;
  userAv: string;
  userAvc: string;
}

export default function Topbar({ currentRole, onSetRole, offline, onToggleOffline, userName, userAv, userAvc }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="logo">
        <i className="ti ti-building-warehouse" />
        ConstructPro ERP
      </div>

      <div className="role-sw">
        <button className={`rb ${currentRole === 'bureau' ? 'on' : ''}`} onClick={() => onSetRole('bureau')}>
          <i className="ti ti-building" />Bureau
        </button>
        <button className={`rb ${currentRole === 'terrain' ? 'on' : ''}`} onClick={() => onSetRole('terrain')}>
          <i className="ti ti-hard-hat" />Terrain
        </button>
        <button className={`rb ${currentRole === 'client' ? 'on' : ''}`} onClick={() => onSetRole('client')}>
          <i className="ti ti-user-circle" />Client
        </button>
      </div>

      <div className="spacer" />

      {offline && (
        <div className="offline-badge">
          <i className="ti ti-wifi-off" />Hors-ligne
        </div>
      )}

      <button
        className={`btn${offline ? ' red' : ''}`}
        style={{ fontSize: 11, padding: '4px 10px' }}
        onClick={onToggleOffline}
      >
        <i className="ti ti-wifi" />
        {offline ? 'Revenir en ligne' : 'Simuler hors-ligne'}
      </button>

      <div className="notif-btn">
        <i className="ti ti-bell" />
        <div className="notif-dot" />
      </div>

      <div className="user-info">{userName}</div>
      <div className={`av-sm ${userAvc}`}>{userAv}</div>
    </div>
  );
}
