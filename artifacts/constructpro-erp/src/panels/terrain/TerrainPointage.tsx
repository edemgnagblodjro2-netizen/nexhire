import AlertBanner from '../../components/AlertBanner';
import KpiCard from '../../components/KpiCard';

export default function TerrainPointage() {
  return (
    <>
      <div className="krow k3">
        <KpiCard label="Heures semaine" value="36h" />
        <div className="kpi"><div className="klbl">Classification</div><div className="kval" style={{ fontSize: 16, fontFamily: 'monospace' }}>CCQ-N2</div></div>
        <KpiCard label="Chantier principal" value="A" />
      </div>
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-clock" />Mon pointage — semaine du 12 mai</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bord)' }}>
          <span style={{ width: 80, fontSize: 11, color: 'var(--txt2)' }}>Lun 12 mai</span>
          <span className="bdg bb">Chantier A</span>
          <span style={{ fontSize: 11, color: 'var(--txt2)' }}>07:00 → 16:00</span>
          <div style={{ flex: 1 }} />
          <strong>8h</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <span style={{ width: 80, fontSize: 11, color: 'var(--txt2)' }}>Mar 13 mai</span>
          <span className="bdg bb">Chantier A</span>
          <span style={{ fontSize: 11, color: 'var(--txt2)' }}>07:00 → en cours</span>
          <div style={{ flex: 1 }} />
          <strong style={{ color: 'var(--green)' }}>En cours</strong>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn grn" onClick={() => alert('Pointage enregistré!')}><i className="ti ti-clock" /> Pointer entrée / sortie</button>
        </div>
      </div>
      <AlertBanner variant="a" icon="ti-wifi-off">
        Mode hors-ligne: les pointages sont sauvegardés localement et synchronisés au retour réseau.
      </AlertBanner>
    </>
  );
}
