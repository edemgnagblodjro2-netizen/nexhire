export default function TerrainRapport() {
  return (
    <div className="card">
      <div className="chdr"><div className="ctitle"><i className="ti ti-file-text" />Rapport journalier terrain</div></div>
      <div className="fr fr2">
        <div><label className="erp-label">Chantier</label><select className="erp-select"><option>A · Résidences du Lac</option></select></div>
        <div><label className="erp-label">Date</label><input className="erp-input" type="date" defaultValue="2025-05-13" /></div>
      </div>
      <div className="fr fr3">
        <div><label className="erp-label">Météo</label><select className="erp-select"><option>Ensoleillé</option><option>Nuageux</option><option>Pluie</option></select></div>
        <div><label className="erp-label">Temp.</label><input className="erp-input" defaultValue="18°C" /></div>
        <div><label className="erp-label">Travailleurs présents</label><input className="erp-input" type="number" defaultValue={12} /></div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="erp-label">Travaux réalisés</label>
        <textarea className="erp-textarea" style={{ height: 80, resize: 'none' }} defaultValue="Coulée béton dalle B terminée. Armatures C vérifiées." />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="erp-label">Anomalies</label>
        <textarea className="erp-textarea" style={{ height: 50, resize: 'none' }} defaultValue="Livraison béton retardée 90 min." />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="erp-label">Photos du chantier</label>
        <div style={{ border: '1px dashed var(--bord2)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center', cursor: 'pointer', color: 'var(--txt3)' }}>
          <i className="ti ti-camera-plus" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
          <span style={{ fontSize: 12 }}>Ajouter photos horodatées & géolocalisées</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn grn" onClick={() => alert('Rapport soumis!')}><i className="ti ti-check" /> Soumettre</button>
        <button className="btn"><i className="ti ti-device-floppy" /> Brouillon</button>
      </div>
    </div>
  );
}
