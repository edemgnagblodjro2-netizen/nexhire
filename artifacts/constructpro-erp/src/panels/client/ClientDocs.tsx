const DOCS = [
  'Contrat de construction signé — 20 mars 2025',
  'Plans architecturaux approuvés — 15 avr. 2025',
  'Devis descriptif — matériaux — 20 mars 2025',
  'Rapport avancement — avril 2025 — 30 avr. 2025',
];

export default function ClientDocs() {
  return (
    <div className="card">
      <div className="chdr"><div className="ctitle"><i className="ti ti-file" />Documents partagés</div></div>
      {DOCS.map((doc, i) => {
        const parts = doc.split(' — ');
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < DOCS.length - 1 ? '1px solid var(--bord)' : undefined }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 20, color: 'var(--red)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{parts[0]}</div>
              <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{parts[1]}</div>
            </div>
            <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => alert('Téléchargement...')}>
              <i className="ti ti-download" /> Télécharger
            </button>
          </div>
        );
      })}
    </div>
  );
}
