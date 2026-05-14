import Badge from '../../components/Badge';
import AlertBanner from '../../components/AlertBanner';
import { SOUST } from '../../data';

export default function SousTraitants() {
  return (
    <>
      <AlertBanner variant="a" icon="ti-alert-triangle">
        <strong>Acier Montréal</strong> — Certificat RBQ expiré. Accès chantier suspendu.
      </AlertBanner>
      <AlertBanner variant="a" icon="ti-alert-triangle">
        <strong>Plomberie Laurentides</strong> — Attestation CNESST manquante avant mobilisation.
      </AlertBanner>
      <div className="card">
        <div className="chdr">
          <div className="ctitle"><i className="ti ti-briefcase" />Sous-traitants</div>
          <button className="btn pri"><i className="ti ti-plus" /> Ajouter</button>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Entreprise</th><th>Spécialité</th><th>Chantier</th><th>Contrat</th><th>RBQ</th><th>CNESST</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {SOUST.map((s, i) => (
              <tr key={i}>
                <td><strong>{s.nom}</strong></td>
                <td style={{ color: 'var(--txt2)' }}>{s.spec}</td>
                <td><span className="bdg bb">{s.ch}</span></td>
                <td style={{ fontWeight: 500 }}>{s.contrat}</td>
                <td>{s.rbq ? <span className="bdg bg">✓ Valide</span> : <span className="bdg br">! Manquant</span>}</td>
                <td>{s.cnesst ? <span className="bdg bg">✓ Conforme</span> : <span className="bdg br">! Manquant</span>}</td>
                <td><Badge st={s.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
