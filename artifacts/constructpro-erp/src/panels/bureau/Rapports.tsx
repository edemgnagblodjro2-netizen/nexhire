const raps = [
  { d: '13 mai', c: 'A', ch: 'S. Tremblay' },
  { d: '12 mai', c: 'A', ch: 'S. Tremblay' },
  { d: '12 mai', c: 'B', ch: 'J. Deschamps' },
  { d: '11 mai', c: 'C', ch: 'J. Deschamps' },
];

const photos = ['Coffrage B · 07:45', 'Coulée béton · 09:12', 'Armatures C · 14:30'];

export default function Rapports() {
  return (
    <div className="g2">
      <div>
        <div className="card">
          <div className="chdr">
            <div className="ctitle"><i className="ti ti-file-description" />Nouveau rapport — 13 mai 2025</div>
          </div>
          <div className="fr fr2">
            <div><label className="erp-label">Chantier</label><select className="erp-select"><option>A · Résidences du Lac</option></select></div>
            <div><label className="erp-label">Responsable</label><select className="erp-select"><option>Sophie Tremblay</option></select></div>
          </div>
          <div className="fr fr3">
            <div><label className="erp-label">Météo</label><select className="erp-select"><option>Ensoleillé</option><option>Nuageux</option><option>Pluie</option></select></div>
            <div><label className="erp-label">Température</label><input className="erp-input" type="text" defaultValue="18°C" /></div>
            <div><label className="erp-label">Travailleurs</label><input className="erp-input" type="number" defaultValue={12} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="erp-label">Travaux réalisés</label>
            <textarea className="erp-textarea" style={{ height: 80, resize: 'none' }} defaultValue="Coulée béton dalle B terminée à 11h30. Début barricades zone de prise." />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="erp-label">Anomalies</label>
            <textarea className="erp-textarea" style={{ height: 50, resize: 'none' }} defaultValue="Livraison béton retardée 90 min." />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn grn" onClick={() => alert('Rapport soumis!')}><i className="ti ti-check" /> Soumettre</button>
            <button className="btn"><i className="ti ti-camera" /> Photos</button>
          </div>
        </div>
      </div>

      <div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-history" />Historique</div></div>
          {raps.map((r, i) => (
            <div key={i} className="tli">
              <div style={{ width: 28, height: 28, borderRadius: 'var(--r)', background: 'var(--surf2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--txt2)', flexShrink: 0 }}>{r.c}</div>
              <div className="tli-body">
                <div className="tli-title">{r.d} · Chantier {r.c}</div>
                <div className="tli-sub">{r.ch}</div>
              </div>
              <div className="tli-time"><span className="bdg bg">Soumis</span></div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="chdr"><div className="ctitle"><i className="ti ti-camera" />Photos horodatées</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ background: 'var(--surf2)', borderRadius: 'var(--r)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--txt2)', textAlign: 'center', padding: 6, border: '1px solid var(--bord)', cursor: 'pointer' }}>
                <i className="ti ti-photo" style={{ fontSize: 20, marginBottom: 4, color: 'var(--txt3)' }} />
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
