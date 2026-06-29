/**
 * AgentHub Platform — App: Automatisations
 * Pro placeholder — Power Automate + agents IA
 */

function _css() {
  if (document.getElementById('aut-css')) return;
  const s = document.createElement('style'); s.id = 'aut-css';
  s.textContent = `
.aut-wrap{padding:32px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif}
.aut-hero{background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1px solid #bbf7d0;border-radius:20px;padding:40px;display:flex;gap:32px;align-items:center;margin-bottom:36px}
.aut-hero-icon{font-size:64px;flex-shrink:0}
.aut-hero h1{font-size:22px;font-weight:800;color:#064e3b;margin:0 0 8px}
.aut-hero p{font-size:14px;color:#065f46;margin:0 0 20px;line-height:1.6}
.aut-badge{display:inline-flex;align-items:center;gap:6px;background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:4px 12px;border-radius:99px;border:1px solid #6ee7b7;letter-spacing:.05em;text-transform:uppercase}
.aut-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:36px}
.aut-feat{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px}
.aut-feat-icon{font-size:28px}
.aut-feat h3{font-size:13px;font-weight:700;color:#0f172a;margin:0}
.aut-feat p{font-size:12px;color:#64748b;margin:0;line-height:1.5}
.aut-section-title{font-size:14px;font-weight:700;color:#0f172a;margin:0 0 16px}
.aut-flows{display:flex;flex-direction:column;gap:8px;margin-bottom:32px}
.aut-flow{background:white;border:1.5px solid #e2e8f0;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px}
.aut-flow-icon{font-size:22px;flex-shrink:0}
.aut-flow-body{flex:1}
.aut-flow-body strong{font-size:13px;font-weight:600;color:#0f172a}
.aut-flow-body p{font-size:12px;color:#94a3b8;margin:2px 0 0}
.aut-tag{font-size:11px;padding:2px 8px;border-radius:99px;font-weight:500;flex-shrink:0}
.aut-tag-soon{background:#f1f5f9;color:#94a3b8}
.aut-cta{background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:14px;padding:24px;text-align:center}
.aut-cta p{font-size:14px;color:#065f46;margin:0 0 16px;font-weight:500}
.aut-cta-btn{display:inline-block;background:#059669;color:white;text-decoration:none;border:none;border-radius:8px;padding:10px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.aut-cta-btn:hover{background:#047857}
@media(max-width:640px){.aut-wrap{padding:16px}.aut-hero{flex-direction:column}.aut-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container) {
    _css();
    const FLOWS = [
      ['📧','Notification après diagnostic','Envoie automatiquement le rapport PDF à l\'entreprise dès que le diagnostic est complété.'],
      ['📅','Rappel relance cohorte','Rappelle aux entreprises non complétées de finir leur diagnostic 7 jours avant la clôture.'],
      ['📊','Synchronisation CRM','Crée automatiquement une fiche entreprise dans votre CRM dès qu\'un membre complète le diagnostic.'],
      ['✅','Approbation gouvernance','Déclenche un flux d\'approbation quand une politique IA est générée et soumise pour révision.'],
      ['🔔','Alerte anomalie score','Alerte l\'équipe si un score IMAI dépasse un seuil critique (ex: <20) pour intervention rapide.'],
      ['🔄','Export hebdomadaire','Génère et envoie chaque lundi un rapport CSV consolidé de la cohorte.'],
    ];

    container.innerHTML = `
<div class="aut-wrap">
  <div class="aut-hero">
    <div class="aut-hero-icon">⚡</div>
    <div>
      <h1>Automatisations IA</h1>
      <p>Connectez vos processus d'accompagnement IA à vos outils existants — Microsoft Power Automate, Teams, Outlook et plus. Éliminez les tâches manuelles et concentrez-vous sur la valeur ajoutée.</p>
      <span class="aut-badge">Pro — Bientôt disponible</span>
    </div>
  </div>

  <div class="aut-grid">
    ${[['⚡','Power Automate','Déclenchez des flows automatiques à partir d\'événements AgentHub.'],
       ['🤖','Agents ATLAS','Configurez des agents IA personnalisés pour vos processus internes.'],
       ['🔌','400+ connecteurs','Intégration native avec vos outils : Teams, SharePoint, Outlook, Salesforce…'],
    ].map(([icon,title,desc])=>`
    <div class="aut-feat">
      <div class="aut-feat-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>`).join('')}
  </div>

  <div class="aut-section-title">Automatisations prévues</div>
  <div class="aut-flows">
    ${FLOWS.map(([icon,title,desc])=>`
    <div class="aut-flow">
      <span class="aut-flow-icon">${icon}</span>
      <div class="aut-flow-body">
        <strong>${title}</strong>
        <p>${desc}</p>
      </div>
      <span class="aut-tag aut-tag-soon">Bientôt</span>
    </div>`).join('')}
  </div>

  <div class="aut-cta">
    <p>Ce module est en développement actif. Exprimez vos besoins d'automatisation et nous les prioriserons.</p>
    <a href="mailto:contact@civicainc.ca?subject=Automatisations AgentHub" class="aut-cta-btn">Faire une demande →</a>
  </div>
</div>`;
  },
  unmount(container) {
    container.innerHTML = '';
  },
};
