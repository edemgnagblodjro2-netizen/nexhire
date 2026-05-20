import { useState } from "react";

interface Contrat {
  id: string; title: string; client: string; clientInitials: string; clientColor: string;
  value: string; status: string; statusClass: string;
  signed: string; expires: string; type: string; signataires: number;
}

const CONTRATS: Contrat[] = [
  { id:"#C-1022", title:"Contrat ERP Enterprise — 24 mois",        client:"Ville de Victoriaville",  clientInitials:"JF", clientColor:"#9B6DF5", value:"145 000$", status:"Signé ✓",    statusClass:"crm-badge-teal",   signed:"15 mars 2026",    expires:"15 mars 2028",   type:"ERP Enterprise",   signataires:2 },
  { id:"#C-1021", title:"Contrat AttenteZéro — Plateforme B2G",    client:"Ville de Shawinigan",     clientInitials:"VS", clientColor:"#0FD4A0", value:"82 000$",  status:"En signature", statusClass:"crm-badge-amber",  signed:"—",               expires:"—",              type:"AttenteZéro B2G",  signataires:1 },
  { id:"#C-1020", title:"Contrat ERP Pro — 12 mois",               client:"Groupe LSC",              clientInitials:"KL", clientColor:"#F5A623", value:"52 000$",  status:"Signé ✓",    statusClass:"crm-badge-teal",   signed:"1 janv. 2026",    expires:"31 déc. 2026",   type:"ERP Pro",          signataires:2 },
  { id:"#C-1019", title:"Forfait ERP Enterprise + Support",         client:"Constructions Roy",       clientInitials:"AM", clientColor:"#38C9F5", value:"89 200$",  status:"En révision",  statusClass:"crm-badge-blue",   signed:"—",               expires:"—",              type:"ERP Enterprise",   signataires:0 },
  { id:"#C-1018", title:"Contrat Maintenance mensuelle web",        client:"Immo 3R",                 clientInitials:"SL", clientColor:"#3B6EF5", value:"24 000$",  status:"Signé ✓",    statusClass:"crm-badge-teal",   signed:"1 avr. 2026",     expires:"31 mars 2027",   type:"Maintenance",      signataires:2 },
  { id:"#C-1017", title:"Contrat ERP Starter — 6 mois",            client:"Construction Beaulieu",   clientInitials:"MT", clientColor:"#0FD4A0", value:"28 000$",  status:"Brouillon",    statusClass:"crm-badge-gray",   signed:"—",               expires:"—",              type:"ERP Starter",      signataires:0 },
  { id:"#C-1016", title:"Contrat Site web + SEO",                   client:"CÉGEP Trois-Rivières",    clientInitials:"LB", clientColor:"#22C87A", value:"18 500$",  status:"Expiré",      statusClass:"crm-badge-red",    signed:"1 mai 2025",      expires:"30 avr. 2026",   type:"Site + SEO",       signataires:2 },
  { id:"#C-1015", title:"Contrat Formation & Onboarding",           client:"Transport Mauricie",      clientInitials:"TM", clientColor:"#F55656", value:"8 000$",   status:"Signé ✓",    statusClass:"crm-badge-teal",   signed:"15 avr. 2026",    expires:"15 juil. 2026",  type:"Formation",        signataires:2 },
];

export function ContratsModule() {
  const [filter, setFilter] = useState("tous");
  const [selected, setSelected] = useState<Contrat | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = CONTRATS.filter(c => {
    if (filter === "signes")      return c.status === "Signé ✓";
    if (filter === "en-cours")    return c.status === "En signature" || c.status === "En révision";
    if (filter === "brouillons")  return c.status === "Brouillon";
    if (filter === "expires")     return c.status === "Expiré";
    return true;
  });

  const totalValue = CONTRATS
    .filter(c => c.status === "Signé ✓")
    .reduce((sum, c) => sum + parseInt(c.value.replace(/[^0-9]/g,"")), 0);

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"📝", label:"Contrats actifs",     value:CONTRATS.filter(c=>c.status==="Signé ✓").length.toString(),  change:"Sur les 12 derniers mois", up:true, kc:"#0FD4A0" },
          { icon:"💰", label:"Valeur totale signée", value:`${Math.round(totalValue/1000)}K$`,                          change:"▲ +18% vs an dernier",     up:true, kc:"#3B6EF5" },
          { icon:"⏳", label:"En attente signature", value:CONTRATS.filter(c=>c.status==="En signature").length.toString(), change:"Action requise",           up:false,kc:"#F5A623" },
          { icon:"⚠️", label:"Contrats expirés",    value:CONTRATS.filter(c=>c.status==="Expiré").length.toString(),   change:"À renouveler",              up:false,kc:"#F55656" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-icon">{k.icon}</div>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value">{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        {[["tous","Tous"],["signes","Signés"],["en-cours","En cours"],["brouillons","Brouillons"],["expires","Expirés"]].map(([k,l]) => (
          <span key={k} className={`crm-chip ${filter===k?"active":""}`} onClick={() => setFilter(k)}>{l}</span>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>📤 Exporter</button>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowModal(true)}>+ Nouveau contrat</button>
        </div>
      </div>

      {/* Table */}
      <div className="crm-table-card">
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr>
              <th>ID</th><th>Titre</th><th>Client</th><th>Type</th>
              <th>Valeur</th><th>Statut</th><th>Signé le</th><th>Expiration</th><th>Signataires</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setSelected(c)}>
                  <td style={{ fontSize:11, color:"var(--crm-text3)", fontFamily:"monospace" }}>{c.id}</td>
                  <td style={{ fontWeight:500, fontSize:13, maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                  </td>
                  <td>
                    <div className="crm-avatar-cell">
                      <div className="crm-avatar" style={{ background:c.clientColor, width:24, height:24, fontSize:9 }}>{c.clientInitials}</div>
                      <span style={{ fontSize:12 }}>{c.client}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{c.type}</td>
                  <td style={{ fontWeight:600, color:"#0FD4A0" }}>{c.value}</td>
                  <td><span className={`crm-badge ${c.statusClass}`}>{c.status}</span></td>
                  <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{c.signed}</td>
                  <td style={{ fontSize:11, color: c.status==="Expiré" ? "var(--crm-red)" : "var(--crm-text3)" }}>{c.expires}</td>
                  <td>
                    <div style={{ display:"flex", gap:2 }}>
                      {Array.from({ length:2 }).map((_,i) => (
                        <div key={i} className="crm-avatar" style={{ width:20, height:20, fontSize:9, background: i < c.signataires ? "#3B6EF5" : "var(--crm-bg4)", border: i >= c.signataires ? "1px dashed var(--crm-border)" : "none" }}>
                          {i < c.signataires ? "✓" : "?"}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract detail */}
      {selected && (
        <div className="crm-profile-panel" style={{ width:420 }}>
          <div className="crm-profile-hdr">
            <div>
              <div style={{ fontSize:11, color:"var(--crm-text3)", fontFamily:"monospace", marginBottom:2 }}>{selected.id}</div>
              <div className="crm-profile-name" style={{ fontSize:13 }}>{selected.title}</div>
              <div style={{ display:"flex", gap:6, marginTop:4 }}>
                <span className={`crm-badge ${selected.statusClass}`}>{selected.status}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--crm-text3)", fontSize:18, cursor:"pointer" }}>✕</button>
          </div>
          <div className="crm-profile-body">
            <div className="crm-info-section">
              <div className="crm-info-section-title">Détails du contrat</div>
              <div className="crm-info-row"><span className="crm-info-label">Client</span><span className="crm-info-value">{selected.client}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Type</span><span className="crm-info-value">{selected.type}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Valeur</span><span className="crm-info-value" style={{ color:"#0FD4A0", fontWeight:600 }}>{selected.value}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Signé le</span><span className="crm-info-value">{selected.signed}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Expiration</span><span className="crm-info-value">{selected.expires}</span></div>
            </div>
            <div className="crm-info-section">
              <div className="crm-info-section-title">Signatures ({selected.signataires}/2)</div>
              {[["Client",selected.clientInitials, selected.clientColor, selected.signataires >= 1],["CivicAI","AE","#3B6EF5", selected.signataires >= 2]].map(([who, initials, color, done],i) => (
                <div key={i} className="crm-info-row">
                  <div className="crm-avatar-cell">
                    <div className="crm-avatar" style={{ background:color as string, width:24, height:24, fontSize:9 }}>{initials as string}</div>
                    <span style={{ fontSize:13 }}>{who as string}</span>
                  </div>
                  <span className={`crm-badge ${done ? "crm-badge-teal" : "crm-badge-amber"}`}>{done ? "✓ Signé" : "En attente"}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="crm-btn crm-btn-primary" style={{ flex:1, justifyContent:"center" }}>📩 Envoyer pour signature</button>
              <button className="crm-btn crm-btn-ghost" style={{ justifyContent:"center" }}>📄 PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* New contract modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:20 }}>📝</span>
              <span className="crm-modal-title">Nouveau contrat</span>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group full"><div className="crm-form-label">Titre du contrat *</div><input className="crm-form-input" placeholder="Ex. Contrat ERP Enterprise — 24 mois" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Client *</div><input className="crm-form-input" placeholder="Rechercher un client…" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Type</div><select className="crm-form-select"><option>ERP Enterprise</option><option>ERP Pro</option><option>ERP Starter</option><option>AttenteZéro B2G</option><option>Site web</option><option>Formation</option><option>Maintenance</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Valeur ($)</div><input className="crm-form-input" placeholder="0" type="number" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Durée</div><select className="crm-form-select"><option>6 mois</option><option>12 mois</option><option>24 mois</option><option>36 mois</option><option>Autre</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Signataire client</div><input className="crm-form-input" placeholder="Nom du signataire" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Email signature</div><input className="crm-form-input" placeholder="email@client.ca" type="email" /></div>
                <div className="crm-form-group full"><div className="crm-form-label">Modèle de contrat</div><select className="crm-form-select"><option>Modèle ERP standard</option><option>Modèle B2G AttenteZéro</option><option>Modèle site web</option><option>Modèle formation</option><option>Contrat vierge</option></select></div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowModal(false)}>Créer et envoyer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
