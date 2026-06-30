/**
 * AgentHub Platform — App: M365 Optimizer
 * Pro placeholder — Microsoft 365 licenses, security, Teams, Entra
 */

function _css() {
  if (document.getElementById('m365-css')) return;
  const s = document.createElement('style'); s.id = 'm365-css';
  s.textContent = `
.m365-wrap{padding:var(--sp-8);max-width:900px;margin:0 auto;font-family:var(--font)}
.m365-hero{background:linear-gradient(135deg,var(--color-info-soft) 0%,var(--color-info-bg) 100%);border:1px solid var(--color-info-border);border-radius:var(--r-2xl);padding:var(--sp-10);display:flex;gap:32px;align-items:center;margin-bottom:36px}
.m365-hero-icon{font-size:64px;flex-shrink:0}
.m365-hero h1{font-size:22px;font-weight:800;color:var(--color-info-on);margin:0 0 8px}
.m365-hero p{font-size:14px;color:var(--color-info-on);margin:0 0 20px;line-height:1.6;opacity:.85}
.m365-badge{display:inline-flex;align-items:center;gap:6px;background:var(--color-info-bg);color:var(--color-info-on);font-size:11px;font-weight:700;padding:4px 12px;border-radius:var(--r-pill);border:1px solid var(--color-info-border);letter-spacing:.05em;text-transform:uppercase}
.m365-pillars{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:36px}
.m365-pillar{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:22px}
.m365-pillar-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.m365-pillar-hd span{font-size:24px}
.m365-pillar-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0}
.m365-pillar ul{margin:0;padding:0 0 0 18px;display:flex;flex-direction:column;gap:5px}
.m365-pillar li{font-size:12px;color:var(--text-sub);line-height:1.4}
.m365-mockup{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r-xl);overflow:hidden;margin-bottom:32px}
.m365-mockup-bar{background:var(--color-info);padding:12px 20px;display:flex;align-items:center;gap:10px}
.m365-mockup-bar span{font-size:12px;font-weight:600;color:white}
.m365-mockup-body{padding:20px}
.m365-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.m365-stat{background:var(--bg);border-radius:var(--r-md);padding:14px;text-align:center}
.m365-stat-val{font-size:22px;font-weight:800;color:var(--color-info-on)}
.m365-stat-lbl{font-size:11px;color:var(--muted);margin-top:2px}
.m365-stat-sub{font-size:10px;margin-top:4px;font-weight:600}
.m365-stat-sub.ok{color:var(--color-ok-text)}
.m365-stat-sub.warn{color:var(--color-warn-text)}
.m365-stat-sub.err{color:var(--color-err-text)}
.m365-alert{background:var(--color-warn-soft);border:1px solid var(--color-warn-border);border-radius:var(--r-md);padding:12px 16px;font-size:12px;color:var(--color-warn-on);display:flex;align-items:center;gap:10px}
.m365-cta{background:linear-gradient(135deg,var(--color-info-soft),var(--color-info-bg));border:1px solid var(--color-info-border);border-radius:var(--r-lg);padding:var(--sp-6);text-align:center}
.m365-cta p{font-size:14px;color:var(--color-info-on);margin:0 0 16px;font-weight:500}
.m365-cta-btn{display:inline-block;background:var(--color-info);color:white;text-decoration:none;border:none;border-radius:var(--r);padding:10px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.m365-cta-btn:hover{opacity:.9}
@media(max-width:640px){.m365-wrap{padding:var(--sp-4)}.m365-hero{flex-direction:column}.m365-pillars{grid-template-columns:1fr}.m365-stats{grid-template-columns:repeat(2,1fr)}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container) {
    _css();
    container.innerHTML = `
<div class="m365-wrap">
  <div class="m365-hero">
    <div class="m365-hero-icon">🪟</div>
    <div>
      <h1>M365 Optimizer</h1>
      <p>Auditez et optimisez l'utilisation Microsoft 365 de votre organisation — licences inutilisées, sécurité Entra ID, adoption Teams, Copilot M365. Transformez vos données Microsoft en économies concrètes.</p>
      <span class="m365-badge">Pro — Bientôt disponible</span>
    </div>
  </div>

  <div class="m365-pillars">
    ${[['💰','Optimisation des licences',['Détectez les licences inactives (>30j sans connexion)','Recommandations de downgrade de plan','Simulation d\'économies annuelles potentielles','Rapport prêt pour le CFO']],
       ['🔒','Sécurité & Conformité',['Score de sécurité Microsoft Secure Score','Audit des comptes sans MFA activé','Alertes accès externe non contrôlé','Conformité Entra ID / Intune']],
       ['🤝','Adoption Teams & Copilot',['Taux d\'adoption par département','Utilisation des fonctionnalités IA Copilot','Formation ciblée selon les lacunes','ROI Copilot M365 calculé automatiquement']],
       ['📊','Tableau de bord exécutif',['Vue consolidée multi-entités','Évolution mensuelle des métriques clés','Export PDF pour comité de direction','Benchmarking sectoriel (PME Québec)']],
    ].map(([icon,title,items])=>`
    <div class="m365-pillar">
      <div class="m365-pillar-hd"><span>${icon}</span><h3>${title}</h3></div>
      <ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>
    </div>`).join('')}
  </div>

  <div class="m365-mockup">
    <div class="m365-mockup-bar">
      <span>🪟</span>
      <span>M365 Optimizer — Tableau de bord (aperçu)</span>
    </div>
    <div class="m365-mockup-body">
      <div class="m365-stats">
        <div class="m365-stat">
          <div class="m365-stat-val">47</div>
          <div class="m365-stat-lbl">Licences totales</div>
          <div class="m365-stat-sub warn">12 inactives</div>
        </div>
        <div class="m365-stat">
          <div class="m365-stat-val">$4,200</div>
          <div class="m365-stat-lbl">Économies potentielles / an</div>
          <div class="m365-stat-sub ok">↑ Identifiées</div>
        </div>
        <div class="m365-stat">
          <div class="m365-stat-val">68</div>
          <div class="m365-stat-lbl">Secure Score</div>
          <div class="m365-stat-sub warn">/100 · Moyen</div>
        </div>
        <div class="m365-stat">
          <div class="m365-stat-val">34%</div>
          <div class="m365-stat-lbl">Adoption Copilot</div>
          <div class="m365-stat-sub err">↓ Faible</div>
        </div>
      </div>
      <div class="m365-alert">
        ⚠️ <strong>Action requise :</strong> 8 comptes sans authentification multi-facteurs (MFA) détectés. Risque élevé selon les normes Loi 25.
      </div>
    </div>
  </div>

  <div class="m365-cta">
    <p>M365 Optimizer connecte votre tenant Microsoft 365 en lecture seule — aucune donnée modifiée. Demandez l'accès anticipé.</p>
    <a href="mailto:contact@civicainc.ca?subject=M365 Optimizer AgentHub" class="m365-cta-btn">Demander l'accès anticipé →</a>
  </div>
</div>`;
  },
  unmount(container) {
    container.innerHTML = '';
  },
};
