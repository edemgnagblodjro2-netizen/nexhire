import AlertBanner from '../../components/AlertBanner';

const PLANS = [
  { d: 'Plan structural R+1 — dalle B', v: 'v3.2', a: 'Ing. Simard', dt: '10 mai' },
  { d: 'Coupe transversale fondations', v: 'v1.0', a: 'Ing. Simard', dt: '1 mai' },
];

export default function TerrainPlans() {
  return (
    <>
      <AlertBanner variant="b" icon="ti-info-circle">
        Vous voyez uniquement les plans approuvés pour votre chantier.
      </AlertBanner>
      <div className="card">
        <div className="chdr"><div className="ctitle"><i className="ti ti-blueprint" />Plans approuvés — lecture seule</div></div>
        {PLANS.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < PLANS.length - 1 ? '1px solid var(--bord)' : undefined }}>
            <div style={{ width: 36, height: 36, background: 'var(--bbg)', borderRadius: 'var(--r)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-blueprint" style={{ color: 'var(--btxt)', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.d}</div>
              <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{p.v} · Approuvé {p.dt}</div>
            </div>
            <button className="btn pri" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => alert('Ouverture plan...')}><i className="ti ti-eye" /> Consulter</button>
          </div>
        ))}
      </div>
    </>
  );
}
