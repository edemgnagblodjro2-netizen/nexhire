const ROLES_DATA = [
  { r: 'Direction / Admin', desc: 'Accès complet', perms: ['Finances', 'RH complet', 'Toutes opérations', 'Config système'], av: 'av-t', i: 'ML' },
  { r: 'Chef de chantier', desc: 'Gestion opérationnelle', perms: ['Rapports journaliers', 'Feuilles de temps', 'Plans approuvés', 'Messagerie'], av: 'av-b', i: 'ST' },
  { r: 'Bureau RH', desc: 'Ressources humaines', perms: ['Recrutement', 'Dossiers employés', 'Formations', 'Paie (lecture)'], av: 'av-p', i: 'RH' },
  { r: 'Terrain (ouvrier)', desc: 'Vue terrain uniquement', perms: ['Mes tâches', 'Mon pointage', 'Mon rapport', 'Chat', 'Incident'], av: 'av-g', i: 'TR' },
  { r: 'Client', desc: 'Portail lecture seule', perms: ["Avancement projet", 'Photos', 'Factures reçues'], av: 'av-gr', i: 'CL' },
];

const INTEGRATIONS = [
  { nom: 'Acomba / Sage 50', st: 'Connecté', c: 'bg' },
  { nom: 'CCQ — paie syndicale', st: 'Connecté', c: 'bg' },
  { nom: 'Procore (chantiers)', st: 'En attente', c: 'ba' },
  { nom: 'AutoCAD / Revit', st: 'Non connecté', c: 'bgr' },
  { nom: 'Google Maps GPS', st: 'Connecté', c: 'bg' },
];

const AUDITS = [
  { who: 'Marc L.', action: 'Affecté Sophie T. au chantier A & C', time: '09:55' },
  { who: 'Sophie T.', action: 'Soumis rapport journalier — chantier A', time: '09:41' },
  { who: 'RH', action: 'Pablo Reyes — entrevue planifiée 14 mai', time: '09:10' },
  { who: 'Marc L.', action: 'Budget Q2 approuvé — 80K$ supplémentaire', time: 'Hier' },
  { who: 'Système', action: 'Alerte stock béton — seuil critique atteint', time: '8 mai' },
];

export default function Roles() {
  return (
    <div className="g2">
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-shield" />Rôles & permissions</div></div>
        {ROLES_DATA.map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: i < ROLES_DATA.length - 1 ? '1px solid var(--bord)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div className={`av-sm ${r.av}`}>{r.i}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{r.r}</div>
                <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{r.desc}</div>
              </div>
            </div>
            <div>{r.perms.map((p, j) => <span key={j} className="tag">{p}</span>)}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-history" />Journal d'audit</div></div>
          {AUDITS.map((a, i) => (
            <div key={i} className="tli">
              <div className="dot dg" style={{ marginTop: 5, flexShrink: 0 }} />
              <div className="tli-body"><div className="tli-title">{a.who} — {a.action}</div></div>
              <div className="tli-time">{a.time}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-plug" />Intégrations API</div></div>
          {INTEGRATIONS.map((intg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < INTEGRATIONS.length - 1 ? '1px solid var(--bord)' : undefined }}>
              <i className="ti ti-plug" style={{ fontSize: 15, color: 'var(--txt3)' }} />
              <span style={{ flex: 1, fontSize: 12 }}>{intg.nom}</span>
              <span className={`bdg ${intg.c}`}>{intg.st}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
