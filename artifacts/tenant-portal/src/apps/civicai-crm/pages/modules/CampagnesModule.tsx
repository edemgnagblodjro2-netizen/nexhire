import { useState } from "react";

interface Campagne {
  id: number; name: string; status: string; statusClass: string;
  type: string; sent: number; opened: number; clicked: number;
  segment: string; lastSent: string; color: string;
}

const CAMPAGNES: Campagne[] = [
  { id:1, name:"Relance Q2 — Prospects chauds",    status:"Actif",    statusClass:"crm-badge-teal",  type:"Séquence",  sent:284, opened:61, clicked:18, segment:"Prospects chauds",  lastSent:"Hier, 10h",       color:"#3B6EF5" },
  { id:2, name:"Offre ERP Enterprise — Municipalités",status:"Actif", statusClass:"crm-badge-teal",  type:"Broadcast", sent:48,  opened:31, clicked:9,  segment:"Secteur municipal", lastSent:"Il y a 3j",       color:"#9B6DF5" },
  { id:3, name:"Bienvenue nouveau client",           status:"Actif",   statusClass:"crm-badge-teal",  type:"Auto",      sent:12,  opened:11, clicked:7,  segment:"Nouveaux clients",  lastSent:"Il y a 5h",       color:"#0FD4A0" },
  { id:4, name:"Newsletter mai 2026",                status:"Envoyé",  statusClass:"crm-badge-blue",  type:"Broadcast", sent:642, opened:38, clicked:12, segment:"Tous",              lastSent:"1 mai 2026",      color:"#F5A623" },
  { id:5, name:"Réactivation leads froids",          status:"En pause",statusClass:"crm-badge-amber", type:"Séquence",  sent:89,  opened:14, clicked:3,  segment:"Leads inactifs 90j",lastSent:"Il y a 2 sem.",   color:"#F55656" },
  { id:6, name:"Upsell ERP Starter → Pro",           status:"Brouillon",statusClass:"crm-badge-gray", type:"Séquence",  sent:0,   opened:0,  clicked:0,  segment:"Clients Starter",   lastSent:"—",               color:"#38C9F5" },
];

const TEMPLATES = [
  { icon:"👋", name:"Bienvenue", desc:"Email d'accueil pour nouveaux clients" },
  { icon:"🔥", name:"Relance J+3", desc:"Suivi automatique 3 jours après premier contact" },
  { icon:"💰", name:"Offre spéciale", desc:"Promotion limitée dans le temps" },
  { icon:"📊", name:"Rapport mensuel", desc:"Résumé de performance pour le client" },
  { icon:"🎯", name:"Proposition", desc:"Envoi d'une proposition commerciale" },
  { icon:"🔄", name:"Réactivation", desc:"Réactiver un lead inactif depuis 90j" },
];

export function CampagnesModule() {
  const [view, setView] = useState<"list"|"templates">("list");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);

  function StatBar({ pct, color }: { pct: number; color: string }) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div className="crm-bar-track" style={{ width:60 }}><div className="crm-bar-fill" style={{ width:`${pct}%`, background:color }} /></div>
        <span style={{ fontSize:11, fontWeight:600, color }}>{pct}%</span>
      </div>
    );
  }

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"📧", label:"Emails envoyés (30j)", value:"1 075", change:"▲ +22% vs mois passé", up:true, kc:"#3B6EF5" },
          { icon:"👁", label:"Taux d'ouverture",    value:"38.4%", change:"▲ +4.1% vs industrie", up:true, kc:"#0FD4A0" },
          { icon:"🖱", label:"Taux de clic",         value:"11.2%", change:"▲ +2.3% ce mois",      up:true, kc:"#F5A623" },
          { icon:"🔥", label:"Campagnes actives",    value:CAMPAGNES.filter(c=>c.status==="Actif").length.toString(), change:"Séquences en cours", up:true, kc:"#9B6DF5" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-icon">{k.icon}</div>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value">{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Tabs + actions */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <span className={`crm-chip ${view==="list"?"active":""}`} onClick={() => setView("list")}>Mes campagnes</span>
        <span className={`crm-chip ${view==="templates"?"active":""}`} onClick={() => setView("templates")}>Modèles</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>📊 Analyse</button>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => { setShowModal(true); setStep(1); }}>
            + Nouvelle campagne
          </button>
        </div>
      </div>

      {view === "list" && (
        <div className="crm-table-card">
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead><tr>
                <th>Campagne</th><th>Type</th><th>Statut</th><th>Segment</th>
                <th>Envoyés</th><th>Ouverts</th><th>Clics</th><th>Dernier envoi</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {CAMPAGNES.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:c.color, flexShrink:0 }} />
                        <span style={{ fontWeight:500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td><span className="crm-badge crm-badge-blue" style={{ fontSize:10 }}>{c.type}</span></td>
                    <td><span className={`crm-badge ${c.statusClass}`}>{c.status}</span></td>
                    <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{c.segment}</td>
                    <td style={{ fontWeight:600, color:"var(--crm-text)" }}>{c.sent.toLocaleString()}</td>
                    <td><StatBar pct={c.sent > 0 ? Math.round(c.opened/c.sent*100) : 0} color="#0FD4A0" /></td>
                    <td><StatBar pct={c.sent > 0 ? Math.round(c.clicked/c.sent*100) : 0} color="#3B6EF5" /></td>
                    <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{c.lastSent}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="crm-btn crm-btn-ghost" style={{ fontSize:10, padding:"3px 8px" }}>
                          {c.status === "Actif" ? "⏸ Pause" : "▶ Activer"}
                        </button>
                        <button className="crm-btn crm-btn-ghost" style={{ fontSize:10, padding:"3px 8px" }}>Éditer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "templates" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {TEMPLATES.map(t => (
            <div key={t.name} className="crm-panel" style={{ cursor:"pointer" }} onClick={() => { setShowModal(true); setStep(1); }}>
              <div style={{ padding:"20px 20px 16px" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{t.icon}</div>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--crm-text)", marginBottom:4 }}>{t.name}</div>
                <div style={{ fontSize:12, color:"var(--crm-text3)", lineHeight:1.5 }}>{t.desc}</div>
              </div>
              <div style={{ borderTop:"1px solid var(--crm-border)", padding:"10px 20px" }}>
                <button className="crm-btn crm-btn-ghost" style={{ fontSize:12, width:"100%", justifyContent:"center" }}>
                  Utiliser ce modèle →
                </button>
              </div>
            </div>
          ))}
          {/* Custom */}
          <div className="crm-panel" style={{ cursor:"pointer", border:"1px dashed rgba(255,255,255,0.1)" }} onClick={() => { setShowModal(true); setStep(1); }}>
            <div style={{ padding:"20px", textAlign:"center", color:"var(--crm-text3)" }}>
              <div style={{ fontSize:28, marginBottom:10, opacity:0.4 }}>✏️</div>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:4, color:"var(--crm-text2)" }}>Campagne personnalisée</div>
              <div style={{ fontSize:12, lineHeight:1.5 }}>Créez votre propre séquence from scratch</div>
            </div>
          </div>
        </div>
      )}

      {/* Create campaign modal — 3 steps */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" style={{ width:580 }} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:18 }}>📧</span>
              <span className="crm-modal-title">Nouvelle campagne</span>
              <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                {[1,2,3].map(s => (
                  <div key={s} style={{ width:24, height:24, borderRadius:"50%", background:step>=s?"#3B6EF5":"var(--crm-bg4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:step>=s?"#fff":"var(--crm-text3)" }}>{s}</div>
                ))}
              </div>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              {step === 1 && (
                <>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--crm-text2)", marginBottom:16 }}>Étape 1 — Paramètres généraux</div>
                  <div className="crm-form-grid">
                    <div className="crm-form-group full"><div className="crm-form-label">Nom de la campagne *</div><input className="crm-form-input" placeholder="Ex. Relance prospects chauds juin" /></div>
                    <div className="crm-form-group"><div className="crm-form-label">Type</div><select className="crm-form-select"><option>Broadcast (envoi unique)</option><option>Séquence (multi-étapes)</option><option>Automation (déclenché)</option></select></div>
                    <div className="crm-form-group"><div className="crm-form-label">Segment cible</div><select className="crm-form-select"><option>Tous les contacts</option><option>Prospects chauds</option><option>Clients actifs</option><option>Leads inactifs</option><option>Segment personnalisé</option></select></div>
                    <div className="crm-form-group"><div className="crm-form-label">Expéditeur</div><select className="crm-form-select"><option>Ayaovi — civicai@attentezero.ca</option><option>Sarah — sarah@attentezero.ca</option></select></div>
                    <div className="crm-form-group"><div className="crm-form-label">Objet de l'email *</div><input className="crm-form-input" placeholder="Ex. [Prénom], découvrez notre nouvelle offre ERP" /></div>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--crm-text2)", marginBottom:16 }}>Étape 2 — Contenu de l'email</div>
                  <div style={{ background:"var(--crm-bg3)", border:"1px solid var(--crm-border)", borderRadius:8, overflow:"hidden" }}>
                    {/* Simple email builder */}
                    <div style={{ background:"var(--crm-bg4)", borderBottom:"1px solid var(--crm-border)", padding:"8px 12px", display:"flex", gap:8, flexWrap:"wrap" }}>
                      {["Gras","Italique","Lien","Image","Bouton","Séparateur"].map(t => (
                        <button key={t} className="crm-btn crm-btn-ghost" style={{ fontSize:10, padding:"3px 8px" }}>{t}</button>
                      ))}
                    </div>
                    <textarea className="crm-form-textarea" style={{ border:"none", borderRadius:0, minHeight:180, resize:"none" }}
                      defaultValue="Bonjour {{prénom}},\n\nNous souhaitions vous présenter notre nouvelle offre ERP adaptée aux entreprises comme {{entreprise}}.\n\nSi vous souhaitez planifier une démo, cliquez sur le bouton ci-dessous.\n\nCordialement,\nAyaovi Edem\nFondateur, CivicAI" />
                    <div style={{ padding:"8px 12px", borderTop:"1px solid var(--crm-border)", display:"flex", gap:8 }}>
                      {["{{prénom}}","{{entreprise}}","{{lien_démo}}","{{date}}"].map(v => (
                        <span key={v} className="crm-chip" style={{ fontSize:10 }}>{v}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--crm-text2)", marginBottom:16 }}>Étape 3 — Planification</div>
                  <div className="crm-form-grid">
                    <div className="crm-form-group"><div className="crm-form-label">Envoi</div><select className="crm-form-select"><option>Maintenant</option><option>Planifié</option><option>Déclenché</option></select></div>
                    <div className="crm-form-group"><div className="crm-form-label">Date d'envoi</div><input className="crm-form-input" type="date" defaultValue="2026-05-22" /></div>
                    <div className="crm-form-group"><div className="crm-form-label">Heure</div><input className="crm-form-input" type="time" defaultValue="10:00" /></div>
                    <div className="crm-form-group"><div className="crm-form-label">Fuseau horaire</div><select className="crm-form-select"><option>America/Toronto (EST)</option></select></div>
                  </div>
                  <div style={{ background:"rgba(59,110,245,0.08)", border:"1px solid rgba(59,110,245,0.2)", borderRadius:8, padding:"12px 16px", marginTop:12 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--crm-text)", marginBottom:4 }}>Récapitulatif</div>
                    <div style={{ fontSize:12, color:"var(--crm-text2)" }}>📧 Segment : <strong>Prospects chauds</strong> · <strong>284 contacts</strong></div>
                    <div style={{ fontSize:12, color:"var(--crm-text2)", marginTop:2 }}>⏰ Envoi : <strong>22 mai 2026 à 10h00 (EST)</strong></div>
                  </div>
                </>
              )}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => step > 1 ? setStep(s => s-1) : setShowModal(false)}>
                {step > 1 ? "← Retour" : "Annuler"}
              </button>
              <button className="crm-btn crm-btn-primary" onClick={() => step < 3 ? setStep(s => s+1) : setShowModal(false)}>
                {step < 3 ? "Suivant →" : "🚀 Lancer la campagne"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
