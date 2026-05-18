import { useState } from 'react';
import './erp.css';
import { StoreProvider } from './store';

import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';

import Dashboard from './panels/bureau/Dashboard';
import Chantiers from './panels/bureau/Chantiers';
import Feuilles from './panels/bureau/Feuilles';
import Rapports from './panels/bureau/Rapports';
import Equipements from './panels/bureau/Equipements';
import Materiaux from './panels/bureau/Materiaux';
import Equipe from './panels/bureau/Equipe';
import Affectation from './panels/bureau/Affectation';
import Recrutement from './panels/bureau/Recrutement';
import Formation from './panels/bureau/Formation';
import Devis from './panels/bureau/Devis';
import SousTraitants from './panels/bureau/SousTraitants';
import Budget from './panels/bureau/Budget';
import Permis from './panels/bureau/Permis';
import Incidents from './panels/bureau/Incidents';
import Plans from './panels/bureau/Plans';
import Roles from './panels/bureau/Roles';

import TerrainAccueil from './panels/terrain/TerrainAccueil';
import TerrainTaches from './panels/terrain/TerrainTaches';
import TerrainRapport from './panels/terrain/TerrainRapport';
import TerrainPointage from './panels/terrain/TerrainPointage';
import TerrainMateriaux from './panels/terrain/TerrainMateriaux';
import TerrainPlans from './panels/terrain/TerrainPlans';
import TerrainIncidents from './panels/terrain/TerrainIncidents';

import ClientDashboard from './panels/client/ClientDashboard';
import ClientDocs from './panels/client/ClientDocs';
import ClientFactures from './panels/client/ClientFactures';
import ClientPhotos from './panels/client/ClientPhotos';

import Communication from './panels/Communication';

import type { Role } from './config/navigation';
import { ROLES, PANEL_LABELS, PANEL_ICONS } from './config/navigation';

const PANELS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  chantiers: Chantiers,
  feuilles: Feuilles,
  rapports: Rapports,
  equipements: Equipements,
  materiaux: Materiaux,
  equipe: Equipe,
  affectation: Affectation,
  recrutement: Recrutement,
  formation: Formation,
  devis: Devis,
  'sous-traitants': SousTraitants,
  budget: Budget,
  permis: Permis,
  incidents: Incidents,
  plans: Plans,
  roles: Roles,
  communication: Communication,
  'client-portail': Communication,
  'terrain-accueil': TerrainAccueil,
  'terrain-taches': TerrainTaches,
  'terrain-rapport': TerrainRapport,
  'terrain-pointage': TerrainPointage,
  'terrain-materiaux': TerrainMateriaux,
  'terrain-plans': TerrainPlans,
  'terrain-incidents': TerrainIncidents,
  'client-dashboard': ClientDashboard,
  'client-docs': ClientDocs,
  'client-factures': ClientFactures,
  'client-photos': ClientPhotos,
};

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('bureau');
  const [panelByRole, setPanelByRole] = useState<Record<Role, string>>({
    bureau: 'dashboard',
    terrain: 'terrain-accueil',
    client: 'client-dashboard',
  });
  const [offline, setOffline] = useState(false);

  const currentPanel = panelByRole[currentRole];
  const cfg = ROLES[currentRole];
  const PanelComponent = PANELS[currentPanel];
  const panelLabel = PANEL_LABELS[currentPanel] ?? currentPanel;
  const panelIcon = PANEL_ICONS[currentPanel] ?? 'ti-layout';

  function handleSetRole(role: Role) {
    setCurrentRole(role);
  }

  function handleNavigate(panelId: string) {
    setPanelByRole(prev => ({ ...prev, [currentRole]: panelId }));
  }

  return (
    <StoreProvider>
      <Topbar
        currentRole={currentRole}
        onSetRole={handleSetRole}
        offline={offline}
        onToggleOffline={() => setOffline(v => !v)}
        userName={cfg.uname}
        userAv={cfg.av}
        userAvc={cfg.avc}
      />
      <div className="shell">
        <Sidebar
          currentRole={currentRole}
          currentPanel={currentPanel}
          onNavigate={handleNavigate}
        />
        <div className="main">
          <div className="mhdr">
            <div className="mtitle">
              <i className={`ti ${panelIcon}`} />
              {panelLabel}
            </div>
            {offline && (
              <span className="bdg ba"><i className="ti ti-wifi-off" /> Mode hors-ligne</span>
            )}
          </div>
          <div className="mbody">
            {PanelComponent ? <PanelComponent /> : (
              <div style={{ padding: 20, color: 'var(--txt2)' }}>Panel en développement.</div>
            )}
          </div>
        </div>
      </div>
    </StoreProvider>
  );
}
