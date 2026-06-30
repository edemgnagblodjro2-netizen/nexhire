/**
 * AgentHub Platform — App: Knowledge Hub
 * Pro placeholder — Base de connaissance + ATLAS avec vos documents
 */

function _css() {
  if (document.getElementById('kno-css')) return;
  const s = document.createElement('style'); s.id = 'kno-css';
  s.textContent = `
.kno-wrap{padding:var(--sp-8);max-width:900px;margin:0 auto;font-family:var(--font)}
.kno-hero{background:linear-gradient(135deg,var(--color-warn-soft) 0%,var(--color-warn-bg) 100%);border:1px solid var(--color-warn-border);border-radius:var(--r-2xl);padding:var(--sp-10);display:flex;gap:32px;align-items:center;margin-bottom:36px}
.kno-hero-icon{font-size:64px;flex-shrink:0}
.kno-hero h1{font-size:22px;font-weight:800;color:var(--color-warn-on);margin:0 0 8px}
.kno-hero p{font-size:14px;color:var(--color-warn-on);margin:0 0 20px;line-height:1.6;opacity:.85}
.kno-badge{display:inline-flex;align-items:center;gap:6px;background:var(--color-warn-bg);color:var(--color-warn-on);font-size:11px;font-weight:700;padding:4px 12px;border-radius:var(--r-pill);border:1px solid var(--color-warn-border);letter-spacing:.05em;text-transform:uppercase}
.kno-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:36px}
.kno-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:22px;display:flex;gap:14px}
.kno-card-icon{font-size:30px;flex-shrink:0}
.kno-card h3{font-size:13px;font-weight:700;color:var(--text);margin:0 0 6px}
.kno-card p{font-size:12px;color:var(--text-sub);margin:0;line-height:1.5}
.kno-preview{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r-xl);overflow:hidden;margin-bottom:32px}
.kno-preview-bar{background:var(--bg);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:8px}
.kno-preview-bar span{font-size:12px;font-weight:600;color:var(--text-sub)}
.kno-preview-bar .kno-dot{width:8px;height:8px;border-radius:50%;background:var(--color-warn)}
.kno-chat{padding:20px;display:flex;flex-direction:column;gap:14px}
.kno-msg{display:flex;gap:10px;align-items:flex-start}
.kno-msg.bot .kno-bubble{background:var(--bg);border:1px solid var(--border);color:var(--text-body)}
.kno-msg.user{flex-direction:row-reverse}
.kno-msg.user .kno-bubble{background:var(--primary);color:white}
.kno-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px}
.kno-avatar.bot-av{background:var(--color-warn-bg)}
.kno-avatar.usr-av{background:var(--primary-lt)}
.kno-bubble{font-size:12px;line-height:1.5;padding:10px 14px;border-radius:12px;max-width:75%}
.kno-source{font-size:10px;color:var(--muted);margin-top:4px;display:flex;gap:6px}
.kno-source span{background:var(--bg-2);padding:1px 6px;border-radius:4px}
.kno-cta{background:linear-gradient(135deg,var(--color-warn-soft),var(--color-warn-bg));border:1px solid var(--color-warn-border);border-radius:var(--r-lg);padding:var(--sp-6);text-align:center}
.kno-cta p{font-size:14px;color:var(--color-warn-on);margin:0 0 16px;font-weight:500}
.kno-cta-btn{display:inline-block;background:var(--color-warn-text);color:white;text-decoration:none;border:none;border-radius:var(--r);padding:10px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.kno-cta-btn:hover{opacity:.9}
@media(max-width:640px){.kno-wrap{padding:var(--sp-4)}.kno-hero{flex-direction:column}.kno-grid{grid-template-columns:1fr}}
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
