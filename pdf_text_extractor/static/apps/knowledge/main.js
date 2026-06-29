/**
 * AgentHub Platform — App: Knowledge Hub
 * Pro placeholder — Base de connaissance + ATLAS avec vos documents
 */

function _css() {
  if (document.getElementById('kno-css')) return;
  const s = document.createElement('style'); s.id = 'kno-css';
  s.textContent = `
.kno-wrap{padding:32px;max-width:900px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif}
.kno-hero{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:1px solid #fde68a;border-radius:20px;padding:40px;display:flex;gap:32px;align-items:center;margin-bottom:36px}
.kno-hero-icon{font-size:64px;flex-shrink:0}
.kno-hero h1{font-size:22px;font-weight:800;color:#78350f;margin:0 0 8px}
.kno-hero p{font-size:14px;color:#92400e;margin:0 0 20px;line-height:1.6}
.kno-badge{display:inline-flex;align-items:center;gap:6px;background:#fef9c3;color:#78350f;font-size:11px;font-weight:700;padding:4px 12px;border-radius:99px;border:1px solid #fde68a;letter-spacing:.05em;text-transform:uppercase}
.kno-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:36px}
.kno-card{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:22px;display:flex;gap:14px}
.kno-card-icon{font-size:30px;flex-shrink:0}
.kno-card h3{font-size:13px;font-weight:700;color:#0f172a;margin:0 0 6px}
.kno-card p{font-size:12px;color:#64748b;margin:0;line-height:1.5}
.kno-preview{background:white;border:1.5px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:32px}
.kno-preview-bar{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 20px;display:flex;align-items:center;gap:8px}
.kno-preview-bar span{font-size:12px;font-weight:600;color:#64748b}
.kno-preview-bar .kno-dot{width:8px;height:8px;border-radius:50%;background:#fbbf24}
.kno-chat{padding:20px;display:flex;flex-direction:column;gap:14px}
.kno-msg{display:flex;gap:10px;align-items:flex-start}
.kno-msg.bot .kno-bubble{background:#f8fafc;border:1px solid #e2e8f0;color:#334155}
.kno-msg.user{flex-direction:row-reverse}
.kno-msg.user .kno-bubble{background:#7c3aed;color:white}
.kno-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px}
.kno-avatar.bot-av{background:#fef3c7}
.kno-avatar.usr-av{background:#ede9fe}
.kno-bubble{font-size:12px;line-height:1.5;padding:10px 14px;border-radius:12px;max-width:75%}
.kno-source{font-size:10px;color:#94a3b8;margin-top:4px;display:flex;gap:6px}
.kno-source span{background:#f1f5f9;padding:1px 6px;border-radius:4px}
.kno-cta{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:14px;padding:24px;text-align:center}
.kno-cta p{font-size:14px;color:#78350f;margin:0 0 16px;font-weight:500}
.kno-cta-btn{display:inline-block;background:#d97706;color:white;text-decoration:none;border:none;border-radius:8px;padding:10px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.kno-cta-btn:hover{background:#b45309}
@media(max-width:640px){.kno-wrap{padding:16px}.kno-hero{flex-direction:column}.kno-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container) {
    _css();
    container.innerHTML = `
<div class="kno-wrap">
  <div class="kno-hero">
    <div class="kno-hero-icon">📚</div>
    <div>
      <h1>Knowledge Hub</h1>
      <p>Transformez vos documents internes en une base de connaissance vivante. ATLAS répond aux questions de vos membres en s'appuyant sur VOS guides, politiques et ressources sectorielles — pas sur Internet.</p>
      <span class="kno-badge">Pro — Bientôt disponible</span>
    </div>
  </div>

  <div class="kno-grid">
    ${[['📄','Vos documents, votre IA','Chargez guides sectoriels, politiques, formations PME. ATLAS les utilise comme source de référence exclusive.'],
       ['🎯','Réponses sourcées','Chaque réponse cite le document source. Vos membres savent d\'où vient l\'information.'],
       ['🔒','Contenu isolé par cohorte','Votre base de connaissance est privée — inaccessible aux autres chambres ou partenaires.'],
       ['🔄','Synchronisation Teams/SharePoint','Connectez votre bibliothèque SharePoint pour une mise à jour automatique des documents.'],
    ].map(([icon,title,desc])=>`
    <div class="kno-card">
      <div class="kno-card-icon">${icon}</div>
      <div>
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
    </div>`).join('')}
  </div>

  <div class="kno-preview">
    <div class="kno-preview-bar">
      <span class="kno-dot"></span>
      <span>ATLAS — Knowledge Hub (aperçu)</span>
    </div>
    <div class="kno-chat">
      <div class="kno-msg user">
        <div class="kno-avatar usr-av">👤</div>
        <div class="kno-bubble">Quelles sont les étapes pour obtenir un financement MESI pour mon projet IA?</div>
      </div>
      <div class="kno-msg bot">
        <div class="kno-avatar bot-av">🤖</div>
        <div>
          <div class="kno-bubble">Selon le Guide des programmes MESI 2025-2026 disponible dans votre Knowledge Hub, les étapes sont : <br><br>1. Vérification d'admissibilité (PME québécoise, &lt;500 employés)<br>2. Dépôt du formulaire de déclaration d'intention<br>3. Présentation du plan de transformation numérique<br>4. Évaluation par un conseiller régional MESI<br><br>Le délai moyen de traitement est de 4 à 6 semaines.</div>
          <div class="kno-source"><span>📄 Guide MESI 2025-2026, p.12</span><span>📄 Critères admissibilité PME</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="kno-cta">
    <p>Intéressé par le Knowledge Hub? Dites-nous quels documents vous voudriez y intégrer.</p>
    <a href="mailto:contact@civicainc.ca?subject=Knowledge Hub AgentHub" class="kno-cta-btn">Nous en parler →</a>
  </div>
</div>`;
  },
  unmount(container) {
    container.innerHTML = '';
  },
};
