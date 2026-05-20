import { useState } from "react";

interface Workflow {
  id: number; name: string; status: string; statusClass: string;
  trigger: string; actions: number; runs: number; lastRun: string; color: string;
  steps: { icon:string; label:string; type:string }[];
}

const WORKFLOWS: Workflow[] = [
  {
    id:1, name:"Bienvenue nouveau client",       status:"Actif", statusClass:"crm-badge-teal",   trigger:"Contact créé",      actions:4, runs:28,  lastRun:"Il y a 2h",  color:"#0FD4A0",
    steps:[{icon:"⚡",label:"Contact créé",type:"Déclencheur"},{icon:"⏰",label:"Attendre 5 min",type:"Délai"},{icon:"✉",label:"Email bienvenue",type:"Email"},{icon:"📋",label:"Créer tâche suivi",type:"Action"},{icon:"🏷",label:"Tag: Onboarding",type:"Tag"}],
  },
  {
    id:2, name:"Relance prospect 3 jours",        status:"Actif", statusClass:"crm-badge-teal",   trigger:"Statut Prospect",   actions:3, runs:84,  lastRun:"Il y a 30 min",color:"#3B6EF5",
    steps:[{icon:"⚡",label:"Statut → Prospect",type:"Déclencheur"},{icon:"⏰",label:"Attendre 3 jours",type:"Délai"},{icon:"✉",label:"Email relance",type:"Email"},{icon:"📋",label:"Tâche: Appel suivi",type:"Action"}],
  },
  {
    id:3, name:"Alerte deal immobilier",           status:"Actif", statusClass:"crm-badge-teal",   trigger:"Deal > 50 000$",    actions:2, runs:12,  lastRun:"Il y a 3j",  color:"#F5A623",
    steps:[{icon:"⚡",label:"Deal > 50 000$",type:"Déclencheur"},{icon:"🔔",label:"Notif. Slack",type:"Notification"},{icon:"📋",label:"Assigner à Ayaovi",type:"Action"}],
  },
  {
    id:4, name:"Réactivation leads 90 jours",     status:"En pause",statusClass:"crm-badge-amber", trigger:"Inactif 90 jours",  actions:3, runs:19,  lastRun:"Il y a 2 sem.",color:"#F55656",
    steps:[{icon:"⚡",label:"Inactif 90j",type:"Déclencheur"},{icon:"✉",label:"Email réactivation",type:"Email"},{icon:"⏰",label:"Attendre 7 jours",type:"Délai"},{icon:"🏷",label:"Tag: Lead froid",type:"Tag"}],
  },
  {
    id:5, name:"Rapport hebdomadaire DG",         status:"Actif", statusClass:"crm-badge-teal",   trigger:"Tous les lundis",   actions:1, runs:52,  lastRun:"Lun. 18 mai", color:"#9B6DF5",
    steps:[{icon:"⚡",label:"Chaque lundi 8h",type:"Déclencheur"},{icon:"📊",label:"Envoyer rapport",type:"Email"}],
  },
  {
    id:6, name:"Onboarding ERP Enterprise",       status:"Brouillon",statusClass:"crm-badge-gray", trigger:"Contrat signé",     actions:8, runs:0,   lastRun:"—",          color:"#38C9F5",
    steps:[{icon:"⚡",label:"Contrat signé",type:"Déclencheur"},{icon:"✉",label:"Email confirmation",type:"Email"},{icon:"📋",label:"Créer projet",type:"Action"},{icon:"📅",label:"Planifier kick-off",type:"Calendrier"}],
  },
];

const STEP_COLORS: Record<string,string> = {
  "Déclencheur":"#3B6EF5","Email":"#0FD4A0","Délai":"#F5A623",
  "Action":"#9B6DF5","Tag":"#38C9F5","Notification":"#F55656","Calendrier":"#22C87A",
};

export function AutomationsModule() {
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"⚡", label:"Workflows actifs",      value:WORKFLOWS.filter(w=>w.status==="Actif").length.toString(), change:"Sur "+WORKFLOWS.length+" total", up:true, kc:"#0FD4A0" },
          { icon:"▶️", label:"Exécutions ce mois",    value:"195",  change:"▲ +42 vs mois passé", up:true, kc:"#3B6EF5" },
          { icon:"⏰", label:"Temps économisé (mois)", value:"14h",  change:"Estimé selon les tâches", up:true, kc:"#F5A623" },
          { icon:"✅", label:"Taux de succès",         value:"98.7%",change:"2 erreurs ce mois",  up:true, kc:"#9B6DF5" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-icon">{k.icon}</div>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value">{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <span style={{ fontWeight:600, color:"var(--crm-text)", fontSize:14 }}>{WORKFLOWS.length} automatisations</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>📋 Templates</button>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowModal(true)}>+ Nouveau workflow</button>
        </div>
      </div>

      {/* Workflow cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {WORKFLOWS.map(w => (
          <div key={w.id} className="crm-table-card" style={{ marginBottom:0, cursor:"pointer" }} onClick={() => setSelected(w)}>
            <div style={{ padding:"14px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:w.color, flexShrink:0 }} />
                <span style={{ fontWeight:600, fontSize:14, color:"var(--crm-text)" }}>{w.name}</span>
                <span className={`crm-badge ${w.statusClass}`}>{w.status}</span>
                <div style={{ marginLeft:"auto", display:"flex", gap:16, fontSize:12, color:"var(--crm-text3)" }}>
                  <span>▶ {w.runs} exécutions</span>
                  <span>⏱ {w.lastRun}</span>
                </div>
                <div style={{ display:"flex", gap:6 }} onClick={e => e.stopPropagation()}>
                  <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, padding:"4px 10px" }}>
                    {w.status === "Actif" ? "⏸ Pause" : w.status === "En pause" ? "▶ Activer" : "▶ Activer"}
                  </button>
                  <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, padding:"4px 10px" }}>Éditer</button>
                </div>
              </div>
              {/* Visual flow */}
              <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto", paddingBottom:4 }}>
                {w.steps.map((step, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                    <div style={{
                      background: (STEP_COLORS[step.type] || "#5A5F75") + "18",
                      border: `1px solid ${(STEP_COLORS[step.type] || "#5A5F75")}44`,
                      borderRadius:8, padding:"6px 10px", fontSize:11,
                      color: STEP_COLORS[step.type] || "var(--crm-text2)",
                      whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5,
                    }}>
                      <span>{step.icon}</span>
                      <div>
                        <div style={{ fontSize:9, opacity:0.7, textTransform:"uppercase", letterSpacing:0.5 }}>{step.type}</div>
                        <div style={{ fontWeight:500 }}>{step.label}</div>
                      </div>
                    </div>
                    {i < w.steps.length - 1 && (
                      <div style={{ width:24, textAlign:"center", color:"var(--crm-text3)", fontSize:12, flexShrink:0 }}>→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow detail modal */}
      {selected && (
        <div className="crm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="crm-modal" style={{ width:620 }} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <div style={{ width:10, height:10, borderRadius:"50%", background:selected.color }} />
              <span className="crm-modal-title">{selected.name}</span>
              <span className={`crm-badge ${selected.statusClass}`}>{selected.status}</span>
              <button className="crm-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div style={{ display:"flex", gap:16, marginBottom:20 }}>
                {[
                  { val:selected.runs,    lbl:"Exécutions" },
                  { val:selected.actions, lbl:"Actions" },
                  { val:selected.lastRun, lbl:"Dernière exécution" },
                ].map(s => (
                  <div key={s.lbl} style={{ flex:1, background:"var(--crm-bg3)", borderRadius:8, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontWeight:700, fontSize:18, color:"var(--crm-text)" }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--crm-text3)", marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Flux de travail</div>
              {selected.steps.map((step, i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:8 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:(STEP_COLORS[step.type]||"#5A5F75")+"22", border:`1px solid ${(STEP_COLORS[step.type]||"#5A5F75")}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{step.icon}</div>
                    {i < selected.steps.length-1 && <div style={{ width:2, flex:1, background:"var(--crm-border)", margin:"4px 0" }} />}
                  </div>
                  <div style={{ paddingTop:4 }}>
                    <div style={{ fontSize:10, color:STEP_COLORS[step.type]||"var(--crm-text3)", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:2 }}>{step.type}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--crm-text)" }}>{step.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setSelected(null)}>Fermer</button>
              <button className="crm-btn crm-btn-primary">Éditer le workflow</button>
            </div>
          </div>
        </div>
      )}

      {/* New workflow modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:20 }}>⚡</span>
              <span className="crm-modal-title">Nouveau workflow</span>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group full"><div className="crm-form-label">Nom du workflow *</div><input className="crm-form-input" placeholder="Ex. Relance devis non signé" /></div>
                <div className="crm-form-group full"><div className="crm-form-label">Déclencheur</div>
                  <select className="crm-form-select">
                    <option>Contact créé</option><option>Statut modifié</option><option>Deal ajouté</option>
                    <option>Contrat signé</option><option>Email ouvert</option><option>Date planifiée</option><option>Tag ajouté</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop:16, padding:16, background:"var(--crm-bg3)", borderRadius:8, textAlign:"center", color:"var(--crm-text3)", fontSize:13 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🔧</div>
                L'éditeur visuel de workflow sera disponible ici — glissez-déposez des blocs d'actions pour construire votre automatisation.
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowModal(false)}>Créer le workflow</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
