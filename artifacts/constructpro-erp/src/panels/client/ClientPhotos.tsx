const PHOTOS = [
  { label: 'Fondations terminées', date: '15 mars', loc: 'Zone Nord' },
  { label: 'Ferraillage dalle B', date: '10 mai', loc: 'Bâtiment B' },
  { label: 'Coulée béton en cours', date: '13 mai', loc: 'Dalle B' },
  { label: 'Armatures bâtiment C', date: '12 mai', loc: 'Zone Est' },
  { label: 'Excavation complète', date: '1 mars', loc: 'Ensemble du site' },
  { label: 'Installation coffrages', date: '8 mai', loc: 'Bâtiment A' },
];

export default function ClientPhotos() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{PHOTOS.length} photos partagées par votre entrepreneur</div>
        <button className="btn"><i className="ti ti-download" /> Tout télécharger</button>
      </div>
      <div className="g3">
        {PHOTOS.map((p, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }} onClick={() => alert(`Aperçu: ${p.label}`)}>
            <div style={{ background: 'var(--surf2)', aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)' }}>
              <i className="ti ti-photo" style={{ fontSize: 32, marginBottom: 6 }} />
              <span style={{ fontSize: 10 }}>{p.date}</span>
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{p.label}</div>
              <div style={{ fontSize: 10, color: 'var(--txt2)' }}>{p.loc} · {p.date}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
