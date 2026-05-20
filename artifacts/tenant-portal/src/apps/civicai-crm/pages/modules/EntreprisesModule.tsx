import { useState } from "react";

interface Entreprise {
  id: number; initials: string; color: string;
  name: string; sector: string; city: string; employees: string;
  contacts: number; deals: number; value: string;
  status: string; statusClass: string; lastActivity: string;
  phone: string; website: string; notes: string;
}

const ENTREPRISES: Entreprise[] = [
  { id:1, initials:"VV", color:"#9B6DF5", name:"Ville de Victoriaville",   sector:"Municipal",    city:"Victoriaville, QC", employees:"500+", contacts:3, deals:2, value:"145 000$", status:"Client fidèle",  statusClass:"crm-badge-teal",   lastActivity:"Hier",       phone:"819 758-1541", website:"victoriaville.ca",      notes:"Client depuis 2024. Contrat ERP Enterprise renouvelé en mars 2026." },
  { id:2, initials:"GL", color:"#3B6EF5", name:"Groupe LSC",                sector:"Construction", city:"Montréal, QC",      employees:"200+", contacts:2, deals:3, value:"52 000$",  status:"Négociation",    statusClass:"crm-badge-purple", lastActivity:"Il y a 2j",  phone:"514 788-2200", website:"lsc.ca",                notes:"En cours de négociation ERP Pro. Décision attendue fin mai." },
  { id:3, initials:"CR", color:"#38C9F5", name:"Constructions Roy",          sector:"Construction", city:"Trois-Rivières, QC",employees:"50+",  contacts:1, deals:1, value:"89 200$",  status:"Négociation",    statusClass:"crm-badge-purple", lastActivity:"Il y a 3j",  phone:"819 374-5566", website:"constructionsroy.ca",   notes:"Fondateur très impliqué. Cherche solution ERP Enterprise clé-en-main." },
  { id:4, initials:"IR", color:"#F5A623", name:"Immo 3R",                    sector:"Immobilier",   city:"Québec, QC",        employees:"30+",  contacts:1, deals:1, value:"45 000$",  status:"Client actif",   statusClass:"crm-badge-teal",   lastActivity:"Il y a 2j",  phone:"514 392-1122", website:"immo3r.ca",             notes:"Client satisfait. Opportunité upsell ERP Pro détectée." },
  { id:5, initials:"CT", color:"#22C87A", name:"CÉGEP Trois-Rivières",       sector:"Éducation",    city:"Trois-Rivières, QC",employees:"1000+",contacts:1, deals:1, value:"45 000$",  status:"Prospect chaud", statusClass:"crm-badge-amber",  lastActivity:"Il y a 4j",  phone:"819 376-1721", website:"cegeptr.qc.ca",         notes:"Besoin de CRM + AttenteZéro pour services aux étudiants." },
  { id:6, initials:"VS", color:"#0FD4A0", name:"Ville de Shawinigan",        sector:"Municipal",    city:"Shawinigan, QC",    employees:"300+", contacts:2, deals:1, value:"82 000$",  status:"Prospect chaud", statusClass:"crm-badge-amber",  lastActivity:"Il y a 5j",  phone:"819 536-7211", website:"shawinigan.ca",         notes:"Très intéressés par AttenteZéro B2G. Contact DGA en cours." },
  { id:7, initials:"CB", color:"#F55656", name:"Construction Beaulieu",       sector:"Construction", city:"Sherbrooke, QC",    employees:"80+",  contacts:1, deals:1, value:"89 200$",  status:"Client actif",   statusClass:"crm-badge-teal",   lastActivity:"Il y a 8j",  phone:"819 244-7788", website:"beaulieu.ca",           notes:"Chargé de projets Marc Tremblay référent principal." },
  { id:8, initials:"TM", color:"#9B6DF5", name:"Transport Mauricie",          sector:"Transport",    city:"Shawinigan, QC",    employees:"120+", contacts:1, deals:1, value:"38 000$",  status:"Client actif",   statusClass:"crm-badge-teal",   lastActivity:"Il y a 1j",  phone:"819 537-8800", website:"transportmauricie.ca",  notes:"Contrat en cours. Formation équipe en juillet 2026." },
];

export function EntreprisesModule() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tous");
  const [selected, setSelected] = useState<Entreprise | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = ENTREPRISES.filter(e =>
    (filter === "tous" || e.sector.toLowerCase() === filter) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.sector.toLowerCase().includes(search.toLowerCase()))
  );

  const sectors = [...new Set(ENTREPRISES.map(e => e.sector))];

  return (
    <>
      {/* KPIs */}
      <div className="crm-kpi-grid" style={{ marginBottom:16 }}>
        {[
          { icon:"🏢", label:"Entreprises totales", value:"286",  change:"▲ +14 ce mois", up:true,  kc:"#3B6EF5" },
          { icon:"💰", label:"Valeur totale",        value:"586K$",change:"Portefeuille actif", up:true, kc:"#0FD4A0" },
          { icon:"🤝", label:"Clients actifs",       value:ENTREPRISES.filter(e=>e.status==="Client actif"||e.status==="Client fidèle").length.toString(), change:"Taux rétention 94%", up:true, kc:"#22C87A" },
          { icon:"🔥", label:"En négociation",       value:ENTREPRISES.filter(e=>e.status==="Négociation").length.toString(), change:"Valeur: 141K$", up:true, kc:"#F5A623" },
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
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <span className={`crm-chip ${filter==="tous"?"active":""}`} onClick={() => setFilter("tous")}>Tous ({ENTREPRISES.length})</span>
        {sectors.map(s => (
          <span key={s} className={`crm-chip ${filter===s?"active":""}`} onClick={() => setFilter(s)}>{s}</span>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <div className="crm-header-search" style={{ width:200, margin:0 }}>
            <span className="crm-search-icon">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" />
          </div>
          <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowModal(true)}>+ Nouvelle entreprise</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12, marginBottom:24 }}>
        {filtered.map(e => (
          <div key={e.id} className="crm-panel" style={{ cursor:"pointer" }} onClick={() => setSelected(e)}>
            <div style={{ padding:"16px 16px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div className="crm-avatar" style={{ background:e.color, width:44, height:44, fontSize:15, borderRadius:10 }}>{e.initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:"var(--crm-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name}</div>
                  <div style={{ fontSize:11, color:"var(--crm-text3)", marginTop:1 }}>{e.sector} · {e.city}</div>
                </div>
                <span className={`crm-badge ${e.statusClass}`} style={{ fontSize:9, flexShrink:0 }}>{e.status}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  { val:e.contacts, lbl:"Contacts", c:"#3B6EF5" },
                  { val:e.deals,    lbl:"Deals",    c:"#F5A623" },
                  { val:e.value,    lbl:"Valeur",   c:"#0FD4A0" },
                ].map(s => (
                  <div key={s.lbl} style={{ textAlign:"center", background:"var(--crm-bg3)", borderRadius:6, padding:"6px 4px" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:s.c }}>{s.val}</div>
                    <div style={{ fontSize:10, color:"var(--crm-text3)" }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop:"1px solid var(--crm-border)", padding:"8px 16px", display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--crm-text3)" }}>
              <span>{e.employees} employés</span>
              <span>Actif {e.lastActivity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="crm-profile-panel" style={{ width:460 }}>
          <div className="crm-profile-hdr">
            <div className="crm-profile-av-lg" style={{ background:selected.color, borderRadius:10 }}>{selected.initials}</div>
            <div>
              <div className="crm-profile-name">{selected.name}</div>
              <div className="crm-profile-role">{selected.sector} · {selected.city}</div>
              <span className={`crm-badge ${selected.statusClass}`} style={{ marginTop:4, display:"inline-flex" }}>{selected.status}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:"var(--crm-text3)", fontSize:18, cursor:"pointer" }}>✕</button>
          </div>
          <div className="crm-profile-body">
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
              {[["💰",selected.value,"Valeur","#0FD4A0"],[`👥 ${selected.contacts}`,"","Contacts","#3B6EF5"],[`📊 ${selected.deals}`,"","Deals","#F5A623"]].map(([icon,val,lbl,c],i) => (
                <div key={i} style={{ background:"var(--crm-bg3)", borderRadius:8, padding:"10px", textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:700, color:c as string }}>{icon as string}</div>
                  {val && <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{lbl as string}</div>}
                  {!val && <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{lbl as string}</div>}
                </div>
              ))}
            </div>
            <div className="crm-info-section">
              <div className="crm-info-section-title">Informations</div>
              <div className="crm-info-row"><span className="crm-info-label">Téléphone</span><span className="crm-info-value">{selected.phone}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Site web</span><span className="crm-info-value" style={{ color:"#3B6EF5" }}>{selected.website}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Employés</span><span className="crm-info-value">{selected.employees}</span></div>
              <div className="crm-info-row"><span className="crm-info-label">Dernier contact</span><span className="crm-info-value">{selected.lastActivity}</span></div>
            </div>
            <div className="crm-info-section">
              <div className="crm-info-section-title">Notes</div>
              <div style={{ fontSize:13, color:"var(--crm-text2)", lineHeight:1.6 }}>{selected.notes}</div>
            </div>
            <div className="crm-info-section">
              <div className="crm-info-section-title">Contacts liés ({selected.contacts})</div>
              {[
                { initials:"JF", color:"#9B6DF5", name:"Julie Fontaine", role:"DGA Services citoyens" },
              ].slice(0, selected.contacts).map((c,i) => (
                <div key={i} className="crm-avatar-cell" style={{ padding:"6px 0", borderBottom:"1px solid var(--crm-border)" }}>
                  <div className="crm-avatar" style={{ background:c.color }}>{c.initials}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--crm-text)" }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"var(--crm-text3)" }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="crm-btn crm-btn-primary" style={{ flex:1, justifyContent:"center" }}>📞 Appeler</button>
              <button className="crm-btn crm-btn-ghost" style={{ flex:1, justifyContent:"center" }}>+ Deal</button>
              <button className="crm-btn crm-btn-ghost" style={{ justifyContent:"center" }}>✏️</button>
            </div>
          </div>
        </div>
      )}

      {/* New company modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:20 }}>🏢</span>
              <span className="crm-modal-title">Nouvelle entreprise</span>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group full"><div className="crm-form-label">Nom de l'entreprise *</div><input className="crm-form-input" placeholder="Ex. Ville de Shawinigan" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Secteur</div><select className="crm-form-select"><option>Municipal</option><option>Construction</option><option>Immobilier</option><option>Éducation</option><option>Santé</option><option>Transport</option><option>Commerce</option><option>Autre</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Ville</div><input className="crm-form-input" placeholder="Ex. Montréal, QC" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Téléphone</div><input className="crm-form-input" placeholder="514 000-0000" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Site web</div><input className="crm-form-input" placeholder="www.example.ca" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Employés</div><select className="crm-form-select"><option>1-10</option><option>10-50</option><option>50-200</option><option>200+</option><option>500+</option><option>1000+</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Statut</div><select className="crm-form-select"><option>Prospect</option><option>Prospect chaud</option><option>Négociation</option><option>Client actif</option></select></div>
                <div className="crm-form-group full"><div className="crm-form-label">Notes</div><textarea className="crm-form-textarea" placeholder="Contexte, opportunités, historique…" /></div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowModal(false)}>Créer l'entreprise</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
