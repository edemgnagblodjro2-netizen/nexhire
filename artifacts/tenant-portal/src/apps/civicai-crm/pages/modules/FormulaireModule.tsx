import { useState } from "react";

interface Formulaire {
  id: number; name: string; status: string; statusClass: string;
  submissions: number; views: number; conversion: number;
  created: string; lastSubmit: string; color: string; type: string;
}

const FORMULAIRES: Formulaire[] = [
  { id:1, name:"Demande de démo ERP",            status:"Actif",    statusClass:"crm-badge-teal",  submissions:284, views:1840, conversion:15, created:"1 mars 2026",   lastSubmit:"Il y a 3h",   color:"#3B6EF5", type:"Génération leads" },
  { id:2, name:"Contact / Prise de contact",      status:"Actif",    statusClass:"crm-badge-teal",  submissions:642, views:3200, conversion:20, created:"1 janv. 2026",  lastSubmit:"Il y a 30 min",color:"#0FD4A0", type:"Contact général" },
  { id:3, name:"Satisfaction client (NPS)",       status:"Actif",    statusClass:"crm-badge-teal",  submissions:112, views:480,  conversion:23, created:"15 avr. 2026",  lastSubmit:"Hier",         color:"#F5A623", type:"Sondage NPS" },
  { id:4, name:"Inscription webinaire CivicAI",   status:"Actif",    statusClass:"crm-badge-teal",  submissions:48,  views:320,  conversion:15, created:"10 mai 2026",   lastSubmit:"Il y a 2j",   color:"#9B6DF5", type:"Événement" },
  { id:5, name:"Demande de devis personnalisé",   status:"Actif",    statusClass:"crm-badge-teal",  submissions:89,  views:560,  conversion:16, created:"1 fév. 2026",   lastSubmit:"Il y a 5h",   color:"#22C87A", type:"Génération leads" },
  { id:6, name:"Formulaire partenaires B2G",      status:"En pause", statusClass:"crm-badge-amber", submissions:24,  views:184,  conversion:13, created:"20 mar. 2026",  lastSubmit:"Il y a 1 sem.",color:"#38C9F5", type:"Partenariat" },
  { id:7, name:"Feedback produit — Bêta ERP",     status:"Brouillon",statusClass:"crm-badge-gray",  submissions:0,   views:0,    conversion:0,  created:"Aujourd'hui",   lastSubmit:"—",            color:"#F56DB0", type:"Sondage" },
];

const FIELD_TYPES = [
  { icon:"📝", label:"Texte court" },
  { icon:"📄", label:"Texte long" },
  { icon:"📧", label:"Email" },
  { icon:"📞", label:"Téléphone" },
  { icon:"🔢", label:"Nombre" },
  { icon:"📅", label:"Date" },
  { icon:"▼",  label:"Liste déroulante" },
  { icon:"☑",  label:"Cases à cocher" },
  { icon:"◉",  label:"Boutons radio" },
  { icon:"⭐", label:"Note (1-5)" },
];

export function FormulaireModule() {
  const [selected, setSelected] = useState<Formulaire | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [fields, setFields] = useState([
    { id:1, type:"📝", label:"Prénom *",    required:true  },
    { id:2, type:"📝", label:"Nom *",       required:true  },
    { id:3, type:"📧", label:"Courriel *",  required:true  },
    { id:4, type:"📞", label:"Téléphone",   required:false },
    { id:5, type:"📄", label:"Message",     required:false },
  ]);

  function addField(type: typeof FIELD_TYPES[0]) {
    setFields(f => [...f, { id:Date.now(), type:type.icon, label:type.label, required:false }]);
  }

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"📋", label:"Formulaires actifs",   value:FORMULAIRES.filter(f=>f.status==="Actif").length.toString(), change:"Sur "+FORMULAIRES.length+" total", up:true, kc:"#3B6EF5" },
          { icon:"📥", label:"Soumissions (30j)",     value:"1 199", change:"▲ +28% vs mois passé", up:true, kc:"#0FD4A0" },
          { icon:"👁",  label:"Vues totales (30j)",    value:"6 584", change:"▲ +15% ce mois",       up:true, kc:"#F5A623" },
          { icon:"📈", label:"Taux de conversion moy.",value:"17.3%", change:"▲ +2.1% ce mois",      up:true, kc:"#9B6DF5" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-icon">{k.icon}</div>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value">{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, marginBottom:16, justifyContent:"flex-end" }}>
        <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>📊 Analytics</button>
        <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowBuilder(true)}>+ Créer un formulaire</button>
      </div>

      {/* Cards grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:14 }}>
        {FORMULAIRES.map(f => (
          <div key={f.id} className="crm-panel" style={{ cursor:"pointer" }} onClick={() => setSelected(f)}>
            <div style={{ padding:"16px 16px 12px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:f.color, flexShrink:0, marginTop:5 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--crm-text)", marginBottom:3 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{f.type}</div>
                </div>
                <span className={`crm-badge ${f.statusClass}`} style={{ fontSize:10 }}>{f.status}</span>
              </div>
              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                {[
                  { val:f.submissions.toLocaleString(), lbl:"Soumissions", c:"#0FD4A0" },
                  { val:f.views.toLocaleString(),       lbl:"Vues",        c:"#3B6EF5" },
                  { val:`${f.conversion}%`,             lbl:"Conversion",  c:"#F5A623" },
                ].map(s => (
                  <div key={s.lbl} style={{ textAlign:"center", background:"var(--crm-bg3)", borderRadius:6, padding:"6px 4px" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.val}</div>
                    <div style={{ fontSize:10, color:"var(--crm-text3)" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--crm-border)", padding:"8px 16px", display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--crm-text3)" }}>
              <span>Dernière soumission : {f.lastSubmit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Form detail */}
      {selected && (
        <div className="crm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="crm-modal" style={{ width:500 }} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <div style={{ width:10, height:10, borderRadius:"50%", background:selected.color }} />
              <span className="crm-modal-title">{selected.name}</span>
              <button className="crm-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                {[
                  { val:selected.submissions, lbl:"Soumissions", c:"#0FD4A0" },
                  { val:selected.views,       lbl:"Vues",        c:"#3B6EF5" },
                  { val:`${selected.conversion}%`,lbl:"Conv.",   c:"#F5A623" },
                ].map(s => (
                  <div key={s.lbl} style={{ textAlign:"center", background:"var(--crm-bg3)", borderRadius:8, padding:"12px" }}>
                    <div style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"var(--crm-bg3)", borderRadius:8, padding:"12px 14px", marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Lien de partage</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input className="crm-form-input" readOnly value={`https://civicai.ca/forms/${selected.id}`} style={{ fontSize:12 }} />
                  <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, flexShrink:0 }}>Copier</button>
                </div>
              </div>
              <div style={{ background:"var(--crm-bg3)", borderRadius:8, padding:"12px 14px" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Dernières soumissions</div>
                {[
                  { name:"Marc Tremblay",   time:"Il y a 3h",   score:"—" },
                  { name:"Julie Fontaine",  time:"Hier, 14h22", score:"NPS: 9" },
                  { name:"Sophie Larivière",time:"Il y a 2j",   score:"—" },
                ].map((s,i) => (
                  <div key={i} className="crm-avatar-cell" style={{ padding:"5px 0", borderBottom:i<2?"1px solid var(--crm-border)":"none" }}>
                    <div className="crm-avatar" style={{ width:24, height:24, fontSize:9, background:"#3B6EF5" }}>{s.name[0]}</div>
                    <span style={{ fontSize:12, flex:1 }}>{s.name}</span>
                    <span style={{ fontSize:11, color:"var(--crm-text3)" }}>{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setSelected(null)}>Fermer</button>
              <button className="crm-btn crm-btn-ghost" onClick={() => { setSelected(null); setShowBuilder(true); }}>✏️ Éditer</button>
              <button className="crm-btn crm-btn-primary">📊 Voir toutes les soumissions</button>
            </div>
          </div>
        </div>
      )}

      {/* Form builder */}
      {showBuilder && (
        <div className="crm-modal-overlay" onClick={() => setShowBuilder(false)}>
          <div className="crm-modal" style={{ width:700, maxHeight:"90vh" }} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:18 }}>🔧</span>
              <span className="crm-modal-title">Créateur de formulaire</span>
              <button className="crm-modal-close" onClick={() => setShowBuilder(false)}>✕</button>
            </div>
            <div className="crm-modal-body" style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16 }}>
              {/* Field palette */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Champs disponibles</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {FIELD_TYPES.map(ft => (
                    <button key={ft.label} className="crm-btn crm-btn-ghost" style={{ justifyContent:"flex-start", fontSize:12, gap:8 }} onClick={() => addField(ft)}>
                      <span>{ft.icon}</span>{ft.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Form preview */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Aperçu du formulaire</div>
                <div style={{ background:"var(--crm-bg3)", borderRadius:8, padding:"16px", border:"1px solid var(--crm-border)" }}>
                  <input className="crm-form-input" defaultValue="Titre du formulaire" style={{ fontWeight:700, fontSize:16, marginBottom:8 }} />
                  {fields.map((f,i) => (
                    <div key={f.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div className="crm-form-label">{f.type} {f.label}</div>
                        <input className="crm-form-input" placeholder={f.label} style={{ fontSize:12 }} />
                      </div>
                      <button onClick={() => setFields(fs => fs.filter((_,j) => j!==i))} style={{ background:"none", border:"none", color:"var(--crm-text3)", cursor:"pointer", fontSize:14 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ border:"1px dashed var(--crm-border)", borderRadius:8, padding:"14px", textAlign:"center", fontSize:12, color:"var(--crm-text3)" }}>
                    + Cliquez sur un champ à gauche pour l'ajouter
                  </div>
                </div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowBuilder(false)}>Annuler</button>
              <button className="crm-btn crm-btn-ghost">👁 Prévisualiser</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowBuilder(false)}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
