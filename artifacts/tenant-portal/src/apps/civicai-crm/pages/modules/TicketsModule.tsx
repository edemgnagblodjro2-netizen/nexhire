import { useState } from "react";

interface Ticket {
  id: string; title: string; client: string; clientInitials: string; clientColor: string;
  priority: string; priorityClass: string; status: string; statusClass: string;
  category: string; assignee: string; created: string; updated: string; messages: number;
}

const TICKETS: Ticket[] = [
  { id:"#T-2847", title:"Impossible de se connecter depuis ce matin",      client:"Immo 3R",               clientInitials:"SL", clientColor:"#3B6EF5", priority:"Urgent",  priorityClass:"crm-badge-red",   status:"En cours",    statusClass:"crm-badge-blue",  category:"Accès / Auth",    assignee:"Ayaovi E.", created:"il y a 2h",  updated:"il y a 30 min", messages:5 },
  { id:"#T-2846", title:"Erreur d'export PDF des devis",                    client:"Groupe LSC",             clientInitials:"KL", clientColor:"#F5A623", priority:"Élevé",   priorityClass:"crm-badge-amber", status:"En attente",  statusClass:"crm-badge-amber", category:"Devis / Factures",assignee:"Sarah L.", created:"il y a 5h",  updated:"il y a 1h",     messages:3 },
  { id:"#T-2845", title:"Intégration Google Calendar ne synchronise plus",   client:"CÉGEP Trois-Rivières",   clientInitials:"LB", clientColor:"#22C87A", priority:"Moyen",   priorityClass:"crm-badge-blue",  status:"Ouvert",      statusClass:"crm-badge-gray",  category:"Intégrations",   assignee:"Marc B.",  created:"hier",       updated:"hier",          messages:1 },
  { id:"#T-2844", title:"Les notifications email ne sont pas reçues",        client:"Constructions Roy",      clientInitials:"AM", clientColor:"#38C9F5", priority:"Moyen",   priorityClass:"crm-badge-blue",  status:"Résolu",      statusClass:"crm-badge-teal",  category:"Notifications",  assignee:"Julie T.", created:"il y a 2j", updated:"il y a 4h",     messages:8 },
  { id:"#T-2843", title:"Rapport de ventes affiche des données incorrectes", client:"Ville de Victoriaville", clientInitials:"JF", clientColor:"#9B6DF5", priority:"Élevé",   priorityClass:"crm-badge-amber", status:"En cours",    statusClass:"crm-badge-blue",  category:"Rapports",       assignee:"Ayaovi E.", created:"il y a 3j", updated:"il y a 3h",     messages:6 },
  { id:"#T-2842", title:"Comment créer une séquence d'emails automatique?",  client:"Boutique Chez Marie",    clientInitials:"MC", clientColor:"#9B6DF5", priority:"Faible",  priorityClass:"crm-badge-gray",  status:"Résolu",      statusClass:"crm-badge-teal",  category:"Formation",      assignee:"Sarah L.", created:"il y a 4j", updated:"il y a 2j",     messages:4 },
  { id:"#T-2841", title:"Impossible d'importer le CSV — format non reconnu", client:"Transport Mauricie",     clientInitials:"TM", clientColor:"#F55656", priority:"Moyen",   priorityClass:"crm-badge-blue",  status:"En attente",  statusClass:"crm-badge-amber", category:"Import / Export", assignee:"Marc B.",  created:"il y a 5j", updated:"il y a 3j",     messages:2 },
  { id:"#T-2840", title:"Demande de nouvelle fonctionnalité : signatures",   client:"Construction Beaulieu",  clientInitials:"MT", clientColor:"#0FD4A0", priority:"Faible",  priorityClass:"crm-badge-gray",  status:"Fermé",       statusClass:"crm-badge-gray",  category:"Feature Request",assignee:"Ayaovi E.", created:"il y a 1sem",updated:"il y a 5j",    messages:7 },
];

export function TicketsModule() {
  const [filter, setFilter] = useState("tous");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = TICKETS.filter(t => {
    if (filter === "ouverts")   return t.status === "Ouvert" || t.status === "En attente";
    if (filter === "en-cours")  return t.status === "En cours";
    if (filter === "resolus")   return t.status === "Résolu" || t.status === "Fermé";
    return true;
  });

  const counts = {
    tous: TICKETS.length,
    ouverts: TICKETS.filter(t => t.status === "Ouvert" || t.status === "En attente").length,
    "en-cours": TICKETS.filter(t => t.status === "En cours").length,
    resolus: TICKETS.filter(t => t.status === "Résolu" || t.status === "Fermé").length,
  };

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"🎫", label:"Tickets ouverts", value:"5", change:"▲ +2 cette semaine", up:false, kc:"#F5A623" },
          { icon:"⚡", label:"Urgents / Élevés", value:"3", change:"Nécessitent une action immédiate", up:false, kc:"#F55656" },
          { icon:"✅", label:"Résolus ce mois", value:"24", change:"▲ +8 vs mois passé", up:true, kc:"#0FD4A0" },
          { icon:"⏱", label:"Temps de résolution", value:"4.2h", change:"Moyenne sur 30 jours", up:true, kc:"#3B6EF5" },
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
        {([["tous","Tous"],["ouverts","Ouverts"],["en-cours","En cours"],["resolus","Résolus"]] as const).map(([k,l]) => (
          <span key={k} className={`crm-chip ${filter===k?"active":""}`} onClick={() => setFilter(k)}>
            {l} <span style={{ opacity:0.6, marginLeft:4 }}>({counts[k]})</span>
          </span>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>🔽 Filtres</button>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowModal(true)}>+ Nouveau ticket</button>
        </div>
      </div>

      {/* Table */}
      <div className="crm-table-card">
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr>
              <th>ID</th><th>Sujet</th><th>Client</th><th>Priorité</th><th>Statut</th>
              <th>Catégorie</th><th>Assigné à</th><th>Mise à jour</th><th>💬</th>
            </tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setSelected(t)}>
                  <td style={{ fontSize:11, color:"var(--crm-text3)", fontFamily:"monospace" }}>{t.id}</td>
                  <td style={{ maxWidth:200 }}>
                    <div style={{ fontWeight:500, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                  </td>
                  <td>
                    <div className="crm-avatar-cell">
                      <div className="crm-avatar" style={{ background:t.clientColor, width:24, height:24, fontSize:9 }}>{t.clientInitials}</div>
                      <span style={{ fontSize:12 }}>{t.client}</span>
                    </div>
                  </td>
                  <td><span className={`crm-badge ${t.priorityClass}`}>{t.priority}</span></td>
                  <td><span className={`crm-badge ${t.statusClass}`}>{t.status}</span></td>
                  <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{t.category}</td>
                  <td style={{ fontSize:12, color:"var(--crm-text2)" }}>{t.assignee}</td>
                  <td style={{ fontSize:11, color:"var(--crm-text3)" }}>{t.updated}</td>
                  <td style={{ fontSize:12, color:"var(--crm-text2)" }}>{t.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket detail panel */}
      {selected && (
        <div className="crm-profile-panel" style={{ width:440 }}>
          <div className="crm-profile-hdr">
            <div>
              <div style={{ fontSize:11, color:"var(--crm-text3)", fontFamily:"monospace", marginBottom:2 }}>{selected.id}</div>
              <div className="crm-profile-name" style={{ fontSize:14 }}>{selected.title}</div>
              <div style={{ display:"flex", gap:6, marginTop:6 }}>
                <span className={`crm-badge ${selected.priorityClass}`}>{selected.priority}</span>
                <span className={`crm-badge ${selected.statusClass}`}>{selected.status}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--crm-text3)", fontSize:18, cursor:"pointer" }}>✕</button>
          </div>
          <div className="crm-profile-body">
            <div className="crm-info-section">
              <div className="crm-info-section-title">Informations</div>
              <div className="crm-info-row"><span className="crm-info-label">Client</span><span className="crm-info-value">{selected.client}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Catégorie</span><span className="crm-info-value">{selected.category}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Assigné à</span><span className="crm-info-value">{selected.assignee}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Créé</span><span className="crm-info-value">{selected.created}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Mis à jour</span><span className="crm-info-value">{selected.updated}</span></div>
            </div>
            <div className="crm-info-section">
              <div className="crm-info-section-title">Conversation ({selected.messages} messages)</div>
              {[
                { who:"Client", text:"Bonjour, je n'arrive plus à me connecter depuis ce matin.", time:"il y a 2h", color:"#3B6EF5" },
                { who:"Ayaovi E.", text:"Bonjour ! Je regarde ça tout de suite. Pouvez-vous me confirmer votre adresse courriel ?", time:"il y a 1h30", color:"#0FD4A0" },
                { who:"Client", text:"Bien sûr : contact@example.ca", time:"il y a 1h", color:"#3B6EF5" },
              ].map((m,i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:3 }}>
                    <div className="crm-avatar" style={{ width:20, height:20, fontSize:9, background:m.color }}>{m.who[0]}</div>
                    <span style={{ fontSize:12, fontWeight:600, color:"var(--crm-text)" }}>{m.who}</span>
                    <span style={{ fontSize:11, color:"var(--crm-text3)" }}>{m.time}</span>
                  </div>
                  <div style={{ fontSize:12, color:"var(--crm-text2)", paddingLeft:26, lineHeight:1.5 }}>{m.text}</div>
                </div>
              ))}
              <textarea className="crm-form-textarea" style={{ marginTop:10 }} placeholder="Répondre au client…" rows={3} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="crm-btn crm-btn-primary" style={{ flex:1, justifyContent:"center" }}>Envoyer</button>
              <button className="crm-btn crm-btn-ghost" style={{ flex:1, justifyContent:"center" }}>Résoudre</button>
            </div>
          </div>
        </div>
      )}

      {/* New ticket modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:20 }}>🎫</span>
              <span className="crm-modal-title">Nouveau ticket</span>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group full"><div className="crm-form-label">Sujet *</div><input className="crm-form-input" placeholder="Décrivez le problème en une phrase" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Client</div><input className="crm-form-input" placeholder="Rechercher un client…" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Priorité</div><select className="crm-form-select"><option>Faible</option><option>Moyen</option><option>Élevé</option><option>Urgent</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Catégorie</div><select className="crm-form-select"><option>Accès / Auth</option><option>Intégrations</option><option>Rapports</option><option>Formation</option><option>Feature Request</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Assigné à</div><select className="crm-form-select"><option>Ayaovi E.</option><option>Sarah L.</option><option>Marc B.</option><option>Julie T.</option></select></div>
                <div className="crm-form-group full"><div className="crm-form-label">Description</div><textarea className="crm-form-textarea" placeholder="Détaillez le problème, les étapes pour le reproduire…" rows={4} /></div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowModal(false)}>Créer le ticket</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
