import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import "./crm.css";

// ── Types ────────────────────────────────────────────────────────────────────
type CRMPage =
  | "dashboard" | "contacts" | "entreprises" | "pipeline" | "opportunites"
  | "taches" | "calendrier" | "emails" | "appels"
  | "devis" | "factures" | "produits"
  | "rapports" | "objectifs" | "marketing"
  | "automatisations" | "parametres";

interface Contact {
  id: number; initials: string; color: string;
  name: string; company: string; role: string;
  status: string; statusClass: string;
  score: number; source: string;
  lastContact: string; value: string;
  email: string; phone: string;
}

interface Deal {
  company: string; value: string; initials: string; color: string;
  tag: string; tagClass: string; days: string; daysColor?: string;
}

interface Task {
  title: string; done?: boolean;
  company: string; companyInitials: string; companyColor: string;
  type: string; typeClass: string;
  due: string; dueColor?: string;
  priority: string; priorityClass: string;
  status: string; statusClass: string;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const CONTACTS: Contact[] = [
  { id:1, initials:"SL", color:"#3B6EF5", name:"Sophie Larivière",    company:"Immo 3R",             role:"Directrice acquisition",  status:"Client actif",    statusClass:"crm-badge-teal",   score:94, source:"LinkedIn",  lastContact:"il y a 2j",  value:"45 000$",  email:"sophie@immo3r.ca",          phone:"514 392-1122" },
  { id:2, initials:"MT", color:"#0FD4A0", name:"Marc Tremblay",       company:"Construction Beaulieu",role:"Chargé de projets",       status:"Prospect chaud",  statusClass:"crm-badge-amber",  score:71, source:"Référence",lastContact:"il y a 8j",  value:"89 200$",  email:"marc@beaulieu.ca",          phone:"819 244-7788" },
  { id:3, initials:"JF", color:"#9B6DF5", name:"Julie Fontaine",      company:"Ville de Victoriaville",role:"DGA Services citoyens",  status:"Client fidèle",   statusClass:"crm-badge-teal",   score:98, source:"Direct",    lastContact:"hier",       value:"145 000$", email:"jfontaine@victoriaville.ca",phone:"819 758-1541" },
  { id:4, initials:"KL", color:"#F5A623", name:"Kevin Lapointe",      company:"Groupe LSC",           role:"VP Opérations",          status:"Prospect",         statusClass:"crm-badge-blue",   score:62, source:"LinkedIn",  lastContact:"il y a 15j", value:"52 000$",  email:"k.lapointe@lsc.ca",         phone:"514 788-2200" },
  { id:5, initials:"NB", color:"#F55656", name:"Nadia Beauchamp",     company:"Clinique Santé Plus",  role:"Directrice générale",    status:"Lead froid",       statusClass:"crm-badge-gray",   score:28, source:"Google",    lastContact:"il y a 32j", value:"28 000$",  email:"nadia@cliniquesanteplus.ca",phone:"450 681-9900" },
  { id:6, initials:"AM", color:"#38C9F5", name:"Anthony Martin",      company:"Constructions Roy",    role:"Fondateur & CEO",        status:"Négociation",      statusClass:"crm-badge-purple", score:81, source:"Référence", lastContact:"il y a 5j",  value:"89 200$",  email:"amartin@roy.ca",            phone:"819 374-5566" },
  { id:7, initials:"LB", color:"#22C87A", name:"Lucie Bernard",       company:"CÉGEP Trois-Rivières", role:"Directrice TI",          status:"Prospect chaud",   statusClass:"crm-badge-amber",  score:77, source:"Événement", lastContact:"il y a 4j",  value:"45 000$",  email:"lbernard@cegeptr.qc.ca",    phone:"819 376-1721" },
];

const PIPELINE: Record<string, { label: string; dot: string; count: number; total: string; totalColor?: string; deals: Deal[] }> = {
  qualification: {
    label:"Qualification", dot:"#5A5F75", count:8, total:"183 000$",
    deals:[
      { company:"Clinique Santé Plus",    value:"28 000$", initials:"LB", color:"#3B6EF5", tag:"AttenteZéro", tagClass:"crm-badge-blue",   days:"3j", daysColor:"#F5A623" },
      { company:"CÉGEP Trois-Rivières",   value:"45 000$", initials:"CT", color:"#0FD4A0", tag:"ERP",         tagClass:"crm-badge-purple", days:"12j" },
      { company:"Resto La Belle Époque",  value:"8 500$",  initials:"RE", color:"#F5A623", tag:"Site web",    tagClass:"crm-badge-amber",  days:"1j" },
    ],
  },
  proposition: {
    label:"Proposition", dot:"#3B6EF5", count:9, total:"248 500$",
    deals:[
      { company:"Immo 3R",               value:"65 000$",  initials:"MT", color:"#0FD4A0", tag:"ERP Pro",      tagClass:"crm-badge-blue",  days:"8j", daysColor:"#F5A623" },
      { company:"Ville de Victoriaville", value:"145 000$", initials:"VV", color:"#38C9F5", tag:"AttenteZéro",  tagClass:"crm-badge-cyan",  days:"21j" },
    ],
  },
  negociation: {
    label:"Négociation", dot:"#F5A623", count:6, total:"221 000$",
    deals:[
      { company:"Constructions Roy",  value:"89 200$", initials:"CR", color:"#9B6DF5", tag:"ERP Ent.", tagClass:"crm-badge-purple", days:"35j", daysColor:"#F55656" },
      { company:"Groupe LSC",         value:"52 000$", initials:"GL", color:"#3B6EF5", tag:"ERP Pro",  tagClass:"crm-badge-blue",   days:"18j" },
    ],
  },
  contrat: {
    label:"Contrat", dot:"#9B6DF5", count:4, total:"128 000$",
    deals:[
      { company:"Transport Mauricie", value:"38 000$", initials:"TM", color:"#F55656", tag:"ERP", tagClass:"crm-badge-purple", days:"42j", daysColor:"#F5A623" },
    ],
  },
  gagne: {
    label:"Gagné", dot:"#0FD4A0", count:11, total:"124K$ ce mois", totalColor:"#0FD4A0",
    deals:[
      { company:"Constructions L&R", value:"42 000$", initials:"SL", color:"#0FD4A0", tag:"Conclu ✓", tagClass:"crm-badge-teal", days:"il y a 2j" },
      { company:"Tech Solutions QC", value:"18 500$", initials:"TS", color:"#3B6EF5", tag:"Conclu ✓", tagClass:"crm-badge-teal", days:"il y a 5j" },
    ],
  },
};

const TASKS: Task[] = [
  { title:"Appel de suivi — Démo ERP",          company:"Groupe LSC",           companyInitials:"GL", companyColor:"#3B6EF5", type:"📞 Appel",      typeClass:"crm-badge-blue",   due:"Auj. 14h",   dueColor:"#F5A623", priority:"Urgent",    priorityClass:"crm-badge-red",   status:"En attente", statusClass:"crm-badge-amber" },
  { title:"Envoyer proposition AttenteZéro",     company:"Ville de Shawinigan",  companyInitials:"VS", companyColor:"#0FD4A0", type:"📄 Proposition", typeClass:"crm-badge-amber",  due:"Auj. 17h",   dueColor:"#F5A623", priority:"Urgent",    priorityClass:"crm-badge-red",   status:"En cours",   statusClass:"crm-badge-blue"  },
  { title:"Relance courriel — Devis site web",   company:"Boutique Chez Marie",  companyInitials:"MC", companyColor:"#9B6DF5", type:"✉ Email",        typeClass:"crm-badge-amber",  due:"Demain 10h", dueColor:undefined, priority:"Normal",    priorityClass:"crm-badge-amber", status:"En attente", statusClass:"crm-badge-amber" },
  { title:"Démo ERP — Construction Beaulieu",   company:"Construction Beaulieu",companyInitials:"CB", companyColor:"#F5A623", type:"🎥 Réunion",     typeClass:"crm-badge-purple", due:"Dem. 13h30", dueColor:undefined, priority:"Normal",    priorityClass:"crm-badge-amber", status:"Confirmé",   statusClass:"crm-badge-teal"  },
  { title:"Appel Constructions Roy",             company:"Constructions Roy",    companyInitials:"CR", companyColor:"#9B6DF5", type:"📞 Appel",       typeClass:"crm-badge-gray",   due:"Hier 15h",   dueColor:undefined, priority:"Faible",    priorityClass:"crm-badge-gray",  status:"✓ Complété", statusClass:"crm-badge-teal", done:true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return "#0FD4A0";
  if (s >= 55) return "#F5A623";
  return "#F55656";
}

// ── Sub-pages ─────────────────────────────────────────────────────────────────

function EmptyPage({ icon, title, desc, action }: { icon:string; title:string; desc:string; action?:string }) {
  return (
    <div className="crm-empty">
      <div className="crm-empty-icon">{icon}</div>
      <div className="crm-empty-title">{title}</div>
      <div className="crm-empty-text">{desc}</div>
      {action && <button className="crm-btn crm-btn-primary" style={{ margin:"20px auto 0", display:"inline-flex" }}>{action}</button>}
    </div>
  );
}

function DashboardPage({ setPage }: { setPage:(p:CRMPage) => void }) {
  const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const heights = [55,65,48,70,60,80,72,88,95,85,100,82];
  return (
    <>
      {/* Welcome */}
      <div className="crm-welcome">
        <div style={{ fontSize:22 }}>👋</div>
        <div>
          <h2>Bienvenue, Ayaovi !</h2>
          <p>Vous avez <strong style={{ color:"#F5A623" }}>7 tâches</strong> en attente et <strong style={{ color:"#5885F7" }}>3 réunions</strong> aujourd'hui.</p>
        </div>
        <div className="crm-welcome-actions">
          <button className="crm-btn crm-btn-ghost" onClick={() => setPage("taches")}>Voir les tâches</button>
          <button className="crm-btn crm-btn-primary" onClick={() => setPage("pipeline")}>Pipeline →</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="crm-kpi-grid">
        {[
          { icon:"👥", label:"Contacts totaux", value:"1 284", change:"▲ +12.4% ce mois", up:true, kc:"#3B6EF5", vc:undefined },
          { icon:"💰", label:"Valeur pipeline",  value:"842K$", change:"▲ +8.1% vs mois dernier", up:true, kc:"#0FD4A0", vc:"#0FD4A0" },
          { icon:"🎯", label:"Taux de conversion",value:"28.4%",change:"▼ -2.1% ce mois", up:false,kc:"#F5A623", vc:"#F5A623" },
          { icon:"📈", label:"Revenus ce mois",  value:"124K$", change:"▲ +19.7% vs objectif", up:true, kc:"#9B6DF5", vc:"#9B6DF5" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-icon">{k.icon}</div>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value" style={k.vc ? { color:k.vc } : {}}>{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="crm-stats-row">
        {[
          { val:"38",  lbl:"Deals actifs",       c:"#5885F7" },
          { val:"94%", lbl:"Satisfaction client", c:"#0FD4A0" },
          { val:"7",   lbl:"Tâches urgentes",     c:"#F5A623" },
          { val:"12",  lbl:"Nouveaux leads",      c:"#22C87A" },
          { val:"3",   lbl:"Réunions auj.",        c:"#9B6DF5" },
          { val:"5",   lbl:"Suivis en retard",    c:"#F55656" },
        ].map(s => (
          <div key={s.lbl} className="crm-stat-mini">
            <div className="crm-stat-val" style={{ color:s.c }}>{s.val}</div>
            <div className="crm-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Dash grid */}
      <div className="crm-dash-grid">
        {/* Revenue chart */}
        <div className="crm-panel">
          <div className="crm-panel-hdr">
            <span className="crm-panel-title">Revenus mensuels</span>
            <span style={{ marginLeft:"auto", fontSize:12, color:"#0FD4A0" }}>▲ +24% vs an dernier</span>
          </div>
          <div className="crm-panel-body">
            <div className="crm-mini-chart">
              {heights.map((h, i) => (
                <div key={i} className="crm-bar"
                  style={{
                    height:`${h}%`,
                    background: i < 6 ? "#1A2035" : `rgba(59,110,245,${0.5 + (i - 6) * 0.1})`,
                  }} />
              ))}
            </div>
            <div className="crm-chart-labels">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="crm-panel">
          <div className="crm-panel-hdr">
            <span className="crm-panel-title">Activité récente</span>
          </div>
          <div style={{ padding:"4px 16px" }}>
            {[
              { dot:"#0FD4A0", text:<><strong>Groupe LSC</strong> — Deal de 45 000$ conclu</>,    time:"il y a 32 min" },
              { dot:"#3B6EF5", text:<><strong>Immo 3R</strong> — Proposition envoyée</>,           time:"il y a 1h 15" },
              { dot:"#F5A623", text:<><strong>Marie Côté</strong> ajoutée comme contact</>,        time:"il y a 2h" },
              { dot:"#9B6DF5", text:<>Tâche <strong>Appel de suivi Constructions Roy</strong> complétée</>, time:"il y a 3h" },
              { dot:"#F55656", text:<><strong>Tech Innov Inc.</strong> — Deal perdu (budget)</>,   time:"hier, 16h42" },
            ].map((a,i) => (
              <div key={i} className="crm-activity-item">
                <div className="crm-activity-dot" style={{ background:a.dot }} />
                <div>
                  <div className="crm-activity-text">{a.text}</div>
                  <div className="crm-activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority tasks */}
      <div className="crm-table-card">
        <div className="crm-table-hdr">
          <span className="crm-table-title">Tâches prioritaires aujourd'hui</span>
          <span className="crm-table-count">7</span>
          <button className="crm-btn crm-btn-ghost" style={{ marginLeft:"auto", fontSize:12 }} onClick={() => setPage("taches")}>Voir tout</button>
        </div>
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr>
              <th>Tâche</th><th>Contact</th><th>Type</th><th>Échéance</th><th>Priorité</th><th>Statut</th>
            </tr></thead>
            <tbody>
              {TASKS.filter(t => !t.done).slice(0,4).map((t,i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight:500 }}>{t.title}</span></td>
                  <td>
                    <div className="crm-avatar-cell">
                      <div className="crm-avatar" style={{ background:t.companyColor }}>{t.companyInitials}</div>
                      <span style={{ fontSize:13 }}>{t.company}</span>
                    </div>
                  </td>
                  <td><span className={`crm-badge ${t.typeClass}`}>{t.type}</span></td>
                  <td style={{ color:t.dueColor, fontSize:12 }}>{t.due}</td>
                  <td><span className={`crm-badge ${t.priorityClass}`}>{t.priority}</span></td>
                  <td><span className={`crm-badge ${t.statusClass}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ContactsPage({ onSelectContact }: { onSelectContact:(c:Contact) => void }) {
  const [activeFilter, setActiveFilter] = useState("tous");
  const [search, setSearch] = useState("");

  const filtered = CONTACTS.filter(c =>
    (activeFilter === "tous" || c.status.toLowerCase().includes(activeFilter)) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Filter row */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        {[["tous","Tous (1 284)"],["client","Clients (342)"],["prospect","Prospects (618)"],["lead","Leads (198)"],["inactif","Inactifs (126)"]].map(([k,l]) => (
          <span key={k} className={`crm-chip ${activeFilter===k?"active":""}`} onClick={() => setActiveFilter(k)}>{l}</span>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>🔽 Filtres</button>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>📤 Export</button>
        </div>
      </div>

      <div className="crm-table-card">
        <div className="crm-table-hdr">
          <span className="crm-table-title">Contacts</span>
          <span className="crm-table-count">{filtered.length}</span>
          {/* search inline */}
          <div className="crm-header-search" style={{ marginLeft:"auto", width:200 }}>
            <span className="crm-search-icon">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" />
          </div>
        </div>
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr>
              <th><input type="checkbox" style={{ accentColor:"#3B6EF5" }} /></th>
              <th>Contact</th><th>Entreprise</th><th>Statut</th>
              <th>Score</th><th>Source</th><th>Dernier contact</th><th>Valeur</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => onSelectContact(c)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" style={{ accentColor:"#3B6EF5" }} /></td>
                  <td>
                    <div className="crm-avatar-cell">
                      <div className="crm-avatar" style={{ background:c.color }}>{c.initials}</div>
                      <div>
                        <div className="crm-cell-name">{c.name}</div>
                        <div className="crm-cell-sub">{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize:13, color:"#8B90A8" }}>{c.company}</td>
                  <td><span className={`crm-badge ${c.statusClass}`}>{c.status}</span></td>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div className="crm-score-bar"><div className="crm-score-fill" style={{ width:`${c.score}%`, background:scoreColor(c.score) }} /></div>
                      <span style={{ fontSize:12, fontWeight:600, color:scoreColor(c.score) }}>{c.score}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:12, color:"#8B90A8" }}>{c.source}</td>
                  <td style={{ fontSize:12, color:"#8B90A8" }}>{c.lastContact}</td>
                  <td style={{ fontWeight:600, fontSize:13, color:"#0FD4A0" }}>{c.value}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="crm-btn crm-btn-ghost" style={{ padding:"4px 8px", fontSize:11 }} onClick={() => onSelectContact(c)}>Voir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:12, color:"#8B90A8" }}>
          <span>Affichage de {filtered.length} sur 1 284 contacts</span>
          <div style={{ display:"flex", gap:4 }}>
            {[1,2,3,"…",128].map((p,i) => (
              <div key={i} style={{
                width:28, height:28, borderRadius:6,
                background:p===1?"#3B6EF5":"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.07)",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", fontSize:12, color:p===1?"#fff":"#8B90A8",
              }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function PipelinePage() {
  return (
    <>
      {/* Filter + actions */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        {["Tous","Ce mois","Ce trimestre"].map((l,i) => (
          <span key={l} className={`crm-chip ${i===0?"active":""}`}>{l}</span>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>Vue liste</button>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }}>+ Nouveau deal</button>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="crm-pipe-summary">
        {[
          { val:"842K$", lbl:"Valeur totale pipeline", c:"#5885F7" },
          { val:"28.4%", lbl:"Taux de conversion",     c:"#0FD4A0" },
          { val:"42j",   lbl:"Cycle de vente moyen",   c:"#F5A623" },
          { val:"38",    lbl:"Deals actifs",            c:"#9B6DF5" },
          { val:"124K$", lbl:"Gagnés ce mois",          c:"#22C87A" },
        ].map(s => (
          <div key={s.lbl} className="crm-pipe-stat">
            <div className="crm-pipe-stat-val" style={{ color:s.c }}>{s.val}</div>
            <div className="crm-pipe-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="crm-pipeline">
        {Object.entries(PIPELINE).map(([key, col]) => (
          <div key={key} className="crm-pipeline-col">
            <div className="crm-pipeline-hdr">
              <div className="crm-pipeline-dot" style={{ background:col.dot }} />
              <span className="crm-pipeline-name">{col.label}</span>
              <span className="crm-pipeline-cnt">{col.count}</span>
            </div>
            <div className="crm-pipeline-total" style={col.totalColor ? { color:col.totalColor } : {}}>
              {key === "gagne" ? col.total : `Total: ${col.total}`}
            </div>
            {col.deals.map((d, i) => (
              <div key={i} className="crm-deal-card" style={key==="gagne" ? { borderColor:"rgba(15,212,160,0.3)" } : {}}>
                <div className="crm-deal-company">{d.company}</div>
                <div className="crm-deal-value">{d.value}</div>
                <div className="crm-deal-meta">
                  <div className="crm-deal-avatar" style={{ background:d.color }}>{d.initials}</div>
                  <span className={`crm-badge ${d.tagClass}`} style={{ fontSize:10 }}>{d.tag}</span>
                  <span className="crm-deal-days" style={d.daysColor ? { color:d.daysColor } : {}}>{d.days}</span>
                </div>
              </div>
            ))}
            {/* Add deal */}
            <div style={{ margin:"8px", padding:"8px", border:"1px dashed rgba(255,255,255,0.07)", borderRadius:8, textAlign:"center", fontSize:12, color:"#5A5F75", cursor:"pointer" }}>
              + Ajouter un deal
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TachesPage() {
  const [done, setDone] = useState<Record<number, boolean>>({ 4:true });
  return (
    <>
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        {[["Toutes (24)","tous"],["Aujourd'hui (7)","auj"],["Cette semaine (12)","sem"],["En retard (5)","retard"],["Complétées (84)","done"]].map(([l,k],i) => (
          <span key={k} className={`crm-chip ${i===0?"active":""}`}>{l}</span>
        ))}
        <button className="crm-btn crm-btn-primary" style={{ marginLeft:"auto", fontSize:12 }}>+ Nouvelle tâche</button>
      </div>

      <div className="crm-table-card">
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead><tr>
              <th></th><th>Tâche</th><th>Contact / Entreprise</th><th>Type</th>
              <th>Assigné à</th><th>Échéance</th><th>Priorité</th><th>Statut</th>
            </tr></thead>
            <tbody>
              {TASKS.map((t, i) => {
                const isDone = done[i] || t.done;
                return (
                  <tr key={i} style={{ opacity:isDone?0.6:1 }}>
                    <td>
                      <input type="checkbox" style={{ accentColor:"#3B6EF5" }}
                        checked={!!isDone}
                        onChange={() => setDone(d => ({ ...d, [i]: !isDone }))} />
                    </td>
                    <td>
                      <span style={{ fontWeight:500, textDecoration:isDone?"line-through":"none", color:isDone?"#5A5F75":undefined }}>
                        {t.title}
                      </span>
                    </td>
                    <td>
                      <div className="crm-avatar-cell">
                        <div className="crm-avatar" style={{ background:t.companyColor, width:24, height:24, fontSize:10 }}>{t.companyInitials}</div>
                        <span style={{ fontSize:12 }}>{t.company}</span>
                      </div>
                    </td>
                    <td><span className={`crm-badge ${t.typeClass}`}>{t.type}</span></td>
                    <td style={{ fontSize:12, color:"#8B90A8" }}>Ayaovi</td>
                    <td style={{ fontSize:12, color:t.dueColor || "#8B90A8" }}>{t.due}</td>
                    <td><span className={`crm-badge ${t.priorityClass}`}>{t.priority}</span></td>
                    <td><span className={`crm-badge ${t.statusClass}`}>{t.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RapportsPage() {
  return (
    <>
      <div className="crm-kpi-grid" style={{ marginBottom:20 }}>
        {[
          { label:"Revenus ce mois",  value:"124K$", change:"▲ +19.7%", up:true,  kc:"#0FD4A0", vc:"#0FD4A0" },
          { label:"Deals conclus",    value:"11",    change:"▲ +3 vs mois passé",up:true,  kc:"#3B6EF5", vc:undefined },
          { label:"Taux conversion",  value:"28.4%", change:"▼ -2.1%",  up:false, kc:"#F5A623", vc:"#F5A623" },
          { label:"Valeur moy. deal", value:"22K$",  change:"▲ +8.3%",  up:true,  kc:"#9B6DF5", vc:"#9B6DF5" },
        ].map(k => (
          <div key={k.label} className="crm-kpi" style={{ ["--kc" as any]:k.kc }}>
            <div className="crm-kpi-label">{k.label}</div>
            <div className="crm-kpi-value" style={k.vc?{color:k.vc}:{}}>{k.value}</div>
            <div className={`crm-kpi-change ${k.up?"up":"down"}`}>{k.change}</div>
          </div>
        ))}
      </div>

      <div className="crm-report-grid">
        {/* Donut */}
        <div className="crm-chart-box">
          <div className="crm-chart-title">Revenus par service</div>
          <div className="crm-chart-sub">Distribution des ventes ce trimestre</div>
          <div className="crm-donut-wrap">
            <svg width="110" height="110" viewBox="0 0 42 42" style={{ flexShrink:0 }}>
              <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#3B6EF5" strokeWidth="8" strokeDasharray="40 60" strokeDashoffset="25" />
              <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#0FD4A0" strokeWidth="8" strokeDasharray="28 72" strokeDashoffset="-15" />
              <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#F5A623" strokeWidth="8" strokeDasharray="18 82" strokeDashoffset="-43" />
              <circle cx="21" cy="21" r="15.91549" fill="transparent" stroke="#9B6DF5" strokeWidth="8" strokeDasharray="14 86" strokeDashoffset="-61" />
              <text x="21" y="24" textAnchor="middle" fontSize="5" fill="#E8EAF0" fontFamily="sans-serif">100%</text>
            </svg>
            <div className="crm-legend">
              {[["#3B6EF5","ERP & Gestion — 40%"],["#0FD4A0","AttenteZéro — 28%"],["#F5A623","Web & Mobile — 18%"],["#9B6DF5","Automatisation — 14%"]].map(([c,l]) => (
                <div key={l} className="crm-legend-item">
                  <div className="crm-legend-dot" style={{ background:c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leads par source */}
        <div className="crm-chart-box">
          <div className="crm-chart-title">Leads par source</div>
          <div className="crm-chart-sub">Provenance des nouveaux contacts</div>
          <div className="crm-bar-chart">
            {[["LinkedIn",78,"#3B6EF5"],["Référence",62,"#0FD4A0"],["Google Ads",48,"#F5A623"],["Événements",35,"#9B6DF5"],["Site web",24,"#38C9F5"]].map(([l,v,c]) => (
              <div key={l as string} className="crm-bar-row">
                <div className="crm-bar-label">{l as string}</div>
                <div className="crm-bar-track"><div className="crm-bar-fill" style={{ width:`${v}%`, background:c as string }} /></div>
                <div className="crm-bar-val" style={{ color:c as string }}>{v}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Secteurs */}
        <div className="crm-chart-box">
          <div className="crm-chart-title">Secteurs clients</div>
          <div className="crm-chart-sub">Répartition par industrie</div>
          <div className="crm-bar-chart">
            {[["Construction",85,"#3B6EF5"],["Immobilier",60,"#0FD4A0"],["Santé",45,"#F5A623"],["Commerce",38,"#9B6DF5"],["Municipal",28,"#F56DB0"]].map(([l,v,c]) => (
              <div key={l as string} className="crm-bar-row">
                <div className="crm-bar-label">{l as string}</div>
                <div className="crm-bar-track"><div className="crm-bar-fill" style={{ width:`${v}%`, background:c as string }} /></div>
                <div className="crm-bar-val" style={{ color:c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance équipe */}
        <div className="crm-chart-box">
          <div className="crm-chart-title">Performance équipe</div>
          <div className="crm-chart-sub">Deals conclus par commercial</div>
          <div className="crm-bar-chart">
            {[["Ayaovi",92,"#0FD4A0",11],["Sarah L.",67,"#3B6EF5",8],["Marc B.",50,"#F5A623",6],["Julie T.",33,"#9B6DF5",4]].map(([l,w,c,v]) => (
              <div key={l as string} className="crm-bar-row">
                <div className="crm-bar-label">{l as string}</div>
                <div className="crm-bar-track"><div className="crm-bar-fill" style={{ width:`${w}%`, background:c as string }} /></div>
                <div className="crm-bar-val" style={{ color:c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ParametresPage() {
  const [toggles, setToggles] = useState({ activites:true, rappels:true, leads:true, rapport:false, deals:true });
  const toggle = (k: keyof typeof toggles) => setToggles(t => ({ ...t, [k]:!t[k] }));
  return (
    <div className="crm-settings-grid">
      {/* Nav */}
      <div>
        {[["👤","Profil"],["🏢","Entreprise"],["👥","Équipe & accès"],["🔔","Notifications"],["🔗","Intégrations"],["📧","Courriels"],["🔒","Sécurité"],["💳","Facturation"],["🎨","Apparence"],["📤","Import / Export"]].map(([ic,lb],i) => (
          <div key={lb} className={`crm-nav-item ${i===0?"active":""}`}>{ic} {lb}</div>
        ))}
      </div>
      {/* Panel */}
      <div className="crm-settings-panel">
        {/* Profile */}
        <div>
          <div className="crm-settings-title">Informations du profil</div>
          <div className="crm-settings-desc">Vos informations personnelles et de contact</div>
          <div className="crm-form-grid">
            <div className="crm-form-group"><div className="crm-form-label">Prénom</div><input className="crm-form-input" defaultValue="Ayaovi Edem" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Nom de famille</div><input className="crm-form-input" defaultValue="Gnagblodjro" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Courriel</div><input className="crm-form-input" defaultValue="civicai@attentezero.ca" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Téléphone</div><input className="crm-form-input" defaultValue="905 809-7798" /></div>
            <div className="crm-form-group full"><div className="crm-form-label">Titre / Poste</div><input className="crm-form-input" defaultValue="Fondateur & CEO — CivicAI" /></div>
          </div>
          <button className="crm-btn crm-btn-primary">Enregistrer les modifications</button>
        </div>

        {/* Notifications */}
        <div style={{ marginTop:28 }}>
          <div className="crm-settings-title">Notifications</div>
          <div className="crm-settings-desc">Choisissez quand et comment être notifié</div>
          {([
            ["activites","Nouvelles activités","Email + notification push"],
            ["rappels","Rappels de tâches","30 min avant l'échéance"],
            ["leads","Nouveaux leads","Notification instantanée"],
            ["rapport","Rapport hebdomadaire","Tous les lundis à 8h"],
            ["deals","Deals gagnés / perdus","Notification en temps réel"],
          ] as const).map(([k,n,s]) => (
            <div key={k} className="crm-toggle-row">
              <div>
                <div className="crm-toggle-name">{n}</div>
                <div className="crm-toggle-sub">{s}</div>
              </div>
              <div className={`crm-toggle ${toggles[k]?"on":""}`} onClick={() => toggle(k)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Add Contact Modal ─────────────────────────────────────────────────────────
function AddContactModal({ onClose }: { onClose:() => void }) {
  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={e => e.stopPropagation()}>
        <div className="crm-modal-hdr">
          <span style={{ fontSize:20 }}>👤</span>
          <span className="crm-modal-title">Nouveau contact</span>
          <button className="crm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="crm-modal-body">
          <div className="crm-form-grid">
            <div className="crm-form-group"><div className="crm-form-label">Prénom *</div><input className="crm-form-input" placeholder="Jean" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Nom de famille *</div><input className="crm-form-input" placeholder="Tremblay" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Courriel</div><input className="crm-form-input" placeholder="jean@entreprise.ca" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Téléphone</div><input className="crm-form-input" placeholder="514 000-0000" /></div>
            <div className="crm-form-group"><div className="crm-form-label">Entreprise</div><input className="crm-form-input" placeholder="Nom de l'entreprise" /></div>
            <div className="crm-form-group">
              <div className="crm-form-label">Source</div>
              <select className="crm-form-select">
                <option>LinkedIn</option><option>Référence</option><option>Google Ads</option>
                <option>Événement</option><option>Site web</option><option>Direct</option>
              </select>
            </div>
            <div className="crm-form-group">
              <div className="crm-form-label">Statut</div>
              <select className="crm-form-select">
                <option>Lead froid</option><option>Prospect</option><option>Prospect chaud</option><option>Négociation</option><option>Client actif</option><option>Client fidèle</option>
              </select>
            </div>
            <div className="crm-form-group">
              <div className="crm-form-label">Valeur estimée ($)</div>
              <input className="crm-form-input" placeholder="0" type="number" />
            </div>
            <div className="crm-form-group full">
              <div className="crm-form-label">Notes</div>
              <textarea className="crm-form-textarea" placeholder="Informations supplémentaires…" />
            </div>
          </div>
        </div>
        <div className="crm-modal-footer">
          <button className="crm-btn crm-btn-ghost" onClick={onClose}>Annuler</button>
          <button className="crm-btn crm-btn-primary" onClick={onClose}>Créer le contact</button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Side Panel ────────────────────────────────────────────────────────
function ProfilePanel({ contact, onClose }: { contact:Contact; onClose:() => void }) {
  return (
    <div className="crm-profile-panel">
      <div className="crm-profile-hdr">
        <div className="crm-profile-av-lg" style={{ background:contact.color }}>{contact.initials}</div>
        <div>
          <div className="crm-profile-name">{contact.name}</div>
          <div className="crm-profile-role">{contact.role} · {contact.company}</div>
        </div>
        <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", color:"#5A5F75", fontSize:18, cursor:"pointer" }}>✕</button>
      </div>
      <div className="crm-profile-body">
        <div className="crm-info-section">
          <div className="crm-info-section-title">Coordonnées</div>
          <div className="crm-info-row"><span className="crm-info-label">Courriel</span><span className="crm-info-value">{contact.email}</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Téléphone</span><span className="crm-info-value">{contact.phone}</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Entreprise</span><span className="crm-info-value">{contact.company}</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Source</span><span className="crm-info-value">{contact.source}</span></div>
        </div>
        <div className="crm-info-section">
          <div className="crm-info-section-title">CRM</div>
          <div className="crm-info-row"><span className="crm-info-label">Statut</span><span className={`crm-badge ${contact.statusClass}`}>{contact.status}</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Score</span><span className="crm-info-value" style={{ color:scoreColor(contact.score), fontWeight:600 }}>{contact.score} / 100</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Valeur</span><span className="crm-info-value" style={{ color:"#0FD4A0", fontWeight:600 }}>{contact.value}</span></div>
          <div className="crm-info-row"><span className="crm-info-label">Dernier contact</span><span className="crm-info-value">{contact.lastContact}</span></div>
        </div>
        <div className="crm-info-section">
          <div className="crm-info-section-title">Activité récente</div>
          {[
            { dot:"#3B6EF5", text:"Proposition envoyée", time:"il y a 2j" },
            { dot:"#0FD4A0", text:"Appel de qualification — 30 min", time:"il y a 1 sem." },
            { dot:"#F5A623", text:"Contact ajouté via LinkedIn", time:"il y a 3 sem." },
          ].map((a,i) => (
            <div key={i} className="crm-activity-item">
              <div className="crm-activity-dot" style={{ background:a.dot }} />
              <div>
                <div className="crm-activity-text">{a.text}</div>
                <div className="crm-activity-time">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <button className="crm-btn crm-btn-primary" style={{ flex:1, justifyContent:"center" }}>📞 Appeler</button>
          <button className="crm-btn crm-btn-ghost" style={{ flex:1, justifyContent:"center" }}>✉ Courriel</button>
        </div>
      </div>
    </div>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────
interface NavItem { id: CRMPage; icon: string; label: string; badge?: string; badgeClass?: string; }
interface NavSection { section: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { section:"Principal", items:[
    { id:"dashboard",   icon:"⊞", label:"Tableau de bord" },
    { id:"contacts",    icon:"👥", label:"Contacts",        badge:"1 284", badgeClass:"green" },
    { id:"entreprises", icon:"🏢", label:"Entreprises" },
    { id:"pipeline",    icon:"📊", label:"Pipeline ventes", badge:"18",    badgeClass:"amber" },
    { id:"opportunites",icon:"💡", label:"Opportunités" },
  ]},
  { section:"Activités", items:[
    { id:"taches",    icon:"✓",  label:"Tâches",       badge:"7" },
    { id:"calendrier",icon:"📅", label:"Calendrier" },
    { id:"emails",    icon:"✉",  label:"Courriels",    badge:"3" },
    { id:"appels",    icon:"📞", label:"Appels & SMS" },
  ]},
  { section:"Commerce", items:[
    { id:"devis",    icon:"📄", label:"Devis & Propositions" },
    { id:"factures", icon:"💰", label:"Facturation" },
    { id:"produits", icon:"📦", label:"Produits & Services" },
  ]},
  { section:"Analyse", items:[
    { id:"rapports",  icon:"📈", label:"Rapports" },
    { id:"objectifs", icon:"🎯", label:"Objectifs & KPIs" },
    { id:"marketing", icon:"📢", label:"Marketing" },
  ]},
  { section:"Système", items:[
    { id:"automatisations", icon:"⚡", label:"Automatisations" },
    { id:"parametres",      icon:"⚙", label:"Paramètres" },
  ]},
];

const PAGE_META: Record<CRMPage, { title:string; sub:string; addLabel?:string }> = {
  dashboard:      { title:"Tableau de bord",     sub:"Bonjour Ayaovi — voici votre journée" },
  contacts:       { title:"Contacts",             sub:"1 284 contacts dans votre CRM",          addLabel:"+ Nouveau contact" },
  entreprises:    { title:"Entreprises",           sub:"286 entreprises enregistrées",           addLabel:"+ Nouvelle entreprise" },
  pipeline:       { title:"Pipeline ventes",       sub:"842K$ de valeur totale — 38 deals actifs", addLabel:"+ Nouveau deal" },
  opportunites:   { title:"Opportunités",          sub:"42 opportunités ouvertes" },
  taches:         { title:"Tâches",               sub:"7 tâches pour aujourd'hui",               addLabel:"+ Nouvelle tâche" },
  calendrier:     { title:"Calendrier",            sub:"3 réunions aujourd'hui" },
  emails:         { title:"Courriels intégrés",    sub:"3 messages non lus" },
  appels:         { title:"Appels & SMS",          sub:"Historique des appels" },
  devis:          { title:"Devis & Propositions",  sub:"18 devis actifs",                        addLabel:"+ Nouveau devis" },
  factures:       { title:"Facturation",           sub:"8 factures impayées" },
  produits:       { title:"Produits & Services",   sub:"24 articles dans le catalogue",          addLabel:"+ Nouveau produit" },
  rapports:       { title:"Rapports",              sub:"Analyse des performances — mai 2026" },
  objectifs:      { title:"Objectifs & KPIs",      sub:"Suivi des cibles commerciales" },
  marketing:      { title:"Marketing",             sub:"Campagnes actives" },
  automatisations:{ title:"Automatisations",       sub:"Flux automatisés" },
  parametres:     { title:"Paramètres",            sub:"Configuration du compte et de l'équipe" },
};

// ── Main CRMPage ──────────────────────────────────────────────────────────────
export function CRMPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState<CRMPage>("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Inject Google Fonts
  useEffect(() => {
    const id = "crm-google-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap";
      document.head.appendChild(link);
    }
    return () => { /* keep fonts cached */ };
  }, []);

  const meta = PAGE_META[page];

  function renderPage() {
    switch (page) {
      case "dashboard":     return <DashboardPage setPage={setPage} />;
      case "contacts":      return <ContactsPage onSelectContact={setSelectedContact} />;
      case "pipeline":      return <PipelinePage />;
      case "taches":        return <TachesPage />;
      case "rapports":      return <RapportsPage />;
      case "parametres":    return <ParametresPage />;
      case "entreprises":   return <EmptyPage icon="🏢" title="Entreprises — 286 enregistrées" desc="Cliquez sur + Ajouter pour créer une fiche entreprise." action="+ Nouvelle entreprise" />;
      case "opportunites":  return <EmptyPage icon="💡" title="Opportunités — 42 ouvertes" desc="Suivez vos opportunités de vente depuis leur détection jusqu'à la conclusion." />;
      case "calendrier":    return <EmptyPage icon="📅" title="Calendrier — 3 réunions aujourd'hui" desc="Planifiez vos appels, réunions et démos directement dans le CRM. Synchronisation Google Calendar et Outlook disponible." />;
      case "emails":        return <EmptyPage icon="✉" title="Courriels intégrés" desc="Envoyez et recevez des courriels directement dans le CRM. Toutes les conversations sont liées aux contacts automatiquement." action="Connecter un compte courriel" />;
      case "appels":        return <EmptyPage icon="📞" title="Appels & SMS" desc="Passez des appels et envoyez des SMS directement depuis le CRM. Enregistrement automatique dans l'historique du contact." />;
      case "devis":         return <EmptyPage icon="📄" title="Devis & Propositions — 18 actifs" desc="Créez des devis professionnels en quelques clics, envoyez-les par courriel et suivez leur statut en temps réel." action="+ Nouveau devis" />;
      case "factures":      return <EmptyPage icon="💰" title="Facturation — 8 factures impayées" desc="Gérez vos factures, suivez les paiements et envoyez des rappels automatiques aux clients en retard." />;
      case "produits":      return <EmptyPage icon="📦" title="Produits & Services — 24 articles" desc="Créez votre catalogue de produits et services. Utilisez-les directement dans vos devis et factures." action="+ Nouveau produit" />;
      case "objectifs":     return <EmptyPage icon="🎯" title="Objectifs & KPIs" desc="Définissez des cibles commerciales pour votre équipe et suivez l'avancement en temps réel." />;
      case "marketing":     return <EmptyPage icon="📢" title="Marketing" desc="Gérez vos campagnes d'emailing, suivez les ouvertures et les clics, segmentez vos contacts." action="+ Nouvelle campagne" />;
      case "automatisations": return <EmptyPage icon="⚡" title="Automatisations" desc="Créez des flux automatisés pour gagner du temps : relances, affectations, notifications, mise à jour de statuts." action="+ Créer un flux" />;
    }
  }

  return (
    <div className="crm-root">
      {/* ── SIDEBAR ── */}
      <nav className="crm-sidebar">
        {/* Logo */}
        <div className="crm-logo">
          <div className="crm-logo-mark">C</div>
          <div className="crm-logo-text">Civic<span>AI</span> CRM</div>
          <div className="crm-logo-badge">PRO</div>
        </div>

        {/* Back to portal */}
        <button className="crm-back-btn" onClick={() => setLocation("/apps/attentezero/queues")}>
          ← Retour au portail
        </button>

        {/* Nav sections */}
        {NAV.map(section => (
          <div key={section.section}>
            <div className="crm-section-label">{section.section}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`crm-nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => { setPage(item.id); setSelectedContact(null); }}
              >
                <span className="crm-nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && <span className={`crm-nav-badge ${item.badgeClass ?? ""}`}>{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}

        {/* User card */}
        <div className="crm-sidebar-bottom">
          <div className="crm-user-card" onClick={() => setPage("parametres")}>
            <div className="crm-user-avatar">AE</div>
            <div>
              <div className="crm-user-name">Ayaovi Edem</div>
              <div className="crm-user-role">Fondateur & CEO</div>
            </div>
            <div className="crm-user-more">⋯</div>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="crm-main">
        {/* Header */}
        <div className="crm-header">
          <div>
            <div className="crm-header-title">{meta.title}</div>
            <div className="crm-header-sub">{meta.sub}</div>
          </div>
          <div className="crm-header-search">
            <span className="crm-search-icon">🔍</span>
            <input placeholder="Rechercher contacts, deals, tâches…" />
          </div>
          <div className="crm-header-actions">
            <div className="crm-notif-btn">
              🔔
              <div className="crm-notif-dot" />
            </div>
            {meta.addLabel && (
              <button className="crm-btn crm-btn-primary" onClick={() => setShowAddModal(true)}>
                {meta.addLabel}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="crm-content">
          {renderPage()}
        </div>
      </div>

      {/* ── MODALS / PANELS ── */}
      {showAddModal && <AddContactModal onClose={() => setShowAddModal(false)} />}
      {selectedContact && <ProfilePanel contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </div>
  );
}
