import AlertBanner from '../../components/AlertBanner';

export default function TerrainIncidents() {
  return (
    <>
      <AlertBanner variant="r" icon="ti-alert-triangle">
        En cas d'urgence grave, appelez immédiatement le <strong>911</strong> et votre responsable de chantier.
      </AlertBanner>
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-alert-triangle" />Signaler un incident</div></div>
        <div className="fr fr2">
          <div>
            <label className="erp-label">Type d'incident</label>
            <select className="erp-select">
              <option>Quasi-accident</option>
              <option>Blessure mineure</option>
              <option>Blessure grave</option>
              <option>Dommage matériel</option>
            </select>
          </div>
          <div>
            <label className="erp-label">Gravité</label>
            <select className="erp-select">
              <option>Mineur</option>
              <option>Moyen</option>
              <option>Grave</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="erp-label">Description</label>
          <textarea className="erp-textarea" style={{ height: 80, resize: 'none' }} placeholder="Décrire ce qui s'est passé, où et comment..." />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="erp-label">Photo de la situation</label>
          <div style={{ border: '1px dashed var(--bord2)', borderRadius: 'var(--r)', padding: 14, textAlign: 'center', cursor: 'pointer', color: 'var(--txt3)' }}>
            <i className="ti ti-camera-plus" style={{ fontSize: 22, display: 'block', marginBottom: 4 }} />
            Ajouter une photo
          </div>
        </div>
        <button className="btn red" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={() => alert('Incident signalé!')}>
          <i className="ti ti-alert-triangle" /> Soumettre le signalement
        </button>
      </div>
    </>
  );
}
