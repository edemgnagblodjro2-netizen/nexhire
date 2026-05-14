import type { NavGroup, Role } from '../config/navigation';
import { ROLES } from '../config/navigation';

interface SidebarProps {
  currentRole: Role;
  currentPanel: string;
  onNavigate: (panelId: string) => void;
}

export default function Sidebar({ currentRole, currentPanel, onNavigate }: SidebarProps) {
  const cfg = ROLES[currentRole];

  return (
    <div className="sb">
      <div className="sb-head">
        <div className="sb-role">{cfg.label}</div>
        <div className="sb-uname">{cfg.uname}</div>
      </div>
      <div className="sb-nav">
        {cfg.nav.map((grp: NavGroup, gi: number) => (
          <div key={gi}>
            <div className="sbs">{grp.s}</div>
            {grp.locked ? (
              <>
                <div className="lock-note">
                  <i className="ti ti-lock" /> Réservé au bureau — accès restreint par rôle
                </div>
                {grp.items.map((item, ii) => (
                  <div key={ii} className="sbi locked">
                    <i className={`ti ${item.icon}`} />
                    {item.label}
                    <i className="ti ti-lock" style={{ marginLeft: 'auto', fontSize: 11 }} />
                  </div>
                ))}
              </>
            ) : (
              grp.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`sbi ${currentPanel === item.id ? 'on' : ''}`}
                  onClick={() => item.id && onNavigate(item.id)}
                >
                  <i className={`ti ${item.icon}`} />
                  {item.label}
                  {item.badge != null && <span className="sbi-badge">{item.badge}</span>}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
