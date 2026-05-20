import { useState, useEffect, useRef } from "react";

interface SearchResult {
  type: string; icon: string; title: string; sub: string; color: string;
}

const ALL_RESULTS: SearchResult[] = [
  { type:"Contact",    icon:"👤", title:"Sophie Larivière",          sub:"Immo 3R · Client actif",              color:"#3B6EF5" },
  { type:"Contact",    icon:"👤", title:"Julie Fontaine",            sub:"Ville de Victoriaville · Client fidèle",color:"#9B6DF5" },
  { type:"Contact",    icon:"👤", title:"Marc Tremblay",             sub:"Construction Beaulieu · Prospect chaud",color:"#0FD4A0" },
  { type:"Entreprise", icon:"🏢", title:"Groupe LSC",                sub:"Construction · Montréal",             color:"#F5A623" },
  { type:"Entreprise", icon:"🏢", title:"Ville de Victoriaville",    sub:"Municipal · Victoriaville",           color:"#9B6DF5" },
  { type:"Entreprise", icon:"🏢", title:"CÉGEP Trois-Rivières",      sub:"Éducation · Trois-Rivières",          color:"#22C87A" },
  { type:"Deal",       icon:"💰", title:"ERP Enterprise — Constructions Roy",sub:"89 200$ · Négociation",       color:"#F55656" },
  { type:"Deal",       icon:"💰", title:"AttenteZéro B2G — Ville de Vic.", sub:"145 000$ · Contrat",           color:"#0FD4A0" },
  { type:"Deal",       icon:"💰", title:"ERP Pro — Immo 3R",         sub:"65 000$ · Proposition",              color:"#3B6EF5" },
  { type:"Tâche",      icon:"✓",  title:"Appel de suivi — Démo ERP", sub:"Aujourd'hui 14h · Urgent",           color:"#F5A623" },
  { type:"Tâche",      icon:"✓",  title:"Envoyer proposition AttenteZéro",sub:"Aujourd'hui 17h · En cours",    color:"#F5A623" },
  { type:"Ticket",     icon:"🎫", title:"Impossible de se connecter",sub:"#T-2847 · Immo 3R · Urgent",         color:"#F55656" },
  { type:"Contrat",    icon:"📝", title:"ERP Enterprise — Victoriaville",sub:"145 000$ · Signé",               color:"#0FD4A0" },
  { type:"Campagne",   icon:"📧", title:"Relance Q2 — Prospects chauds",sub:"Actif · 284 envoyés",            color:"#3B6EF5" },
];

interface Props { onClose: () => void; }

export function SearchModal({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [recent] = useState(["Sophie Larivière", "Groupe LSC", "ERP Enterprise"]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = query.length >= 2
    ? ALL_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.sub.toLowerCase().includes(query.toLowerCase()) ||
        r.type.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="crm-modal-overlay" style={{ alignItems:"flex-start", paddingTop:80 }} onClick={onClose}>
      <div style={{
        width:620, maxHeight:"70vh", overflow:"hidden",
        background:"var(--crm-bg2)", border:"1px solid var(--crm-border2)",
        borderRadius:16, boxShadow:"0 24px 80px rgba(0,0,0,0.6)",
        display:"flex", flexDirection:"column",
      }} onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:"1px solid var(--crm-border)" }}>
          <span style={{ fontSize:18, color:"var(--crm-text3)" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Chercher dans tout le CRM — contacts, deals, tickets…"
            style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:15, color:"var(--crm-text)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background:"none", border:"none", color:"var(--crm-text3)", cursor:"pointer", fontSize:16 }}>✕</button>
          )}
          <kbd style={{ background:"var(--crm-bg3)", border:"1px solid var(--crm-border)", borderRadius:4, padding:"2px 8px", fontSize:11, color:"var(--crm-text3)" }}>ESC</kbd>
        </div>

        {/* Content */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {query.length < 2 && (
            <div style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Recherches récentes</div>
              {recent.map(r => (
                <div key={r} onClick={() => setQuery(r)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", cursor:"pointer", borderBottom:"1px solid var(--crm-border)" }}>
                  <span style={{ fontSize:14, color:"var(--crm-text3)" }}>🕐</span>
                  <span style={{ fontSize:13, color:"var(--crm-text2)" }}>{r}</span>
                </div>
              ))}
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Raccourcis</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["👤 Contacts","contacts"],["🏢 Entreprises","entreprises"],["💰 Deals","pipeline"],["🎫 Tickets","tickets"],["📝 Contrats","contrats"]].map(([l]) => (
                    <span key={l} className="crm-chip" onClick={() => setQuery(l.split(" ")[1])}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {query.length >= 2 && results.length === 0 && (
            <div style={{ padding:"40px 20px", textAlign:"center", color:"var(--crm-text3)" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--crm-text2)", marginBottom:4 }}>Aucun résultat pour « {query} »</div>
              <div style={{ fontSize:12 }}>Essayez un autre mot-clé ou vérifiez l'orthographe</div>
            </div>
          )}

          {query.length >= 2 && results.length > 0 && (
            <div style={{ padding:"8px 0" }}>
              <div style={{ padding:"4px 18px 8px", fontSize:11, color:"var(--crm-text3)" }}>
                {results.length} résultat{results.length > 1 ? "s" : ""} pour « <strong style={{ color:"var(--crm-text)" }}>{query}</strong> »
              </div>
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div style={{ padding:"6px 18px", fontSize:10, fontWeight:600, color:"var(--crm-text3)", textTransform:"uppercase", letterSpacing:1, background:"rgba(255,255,255,0.02)" }}>
                    {type}s ({items.length})
                  </div>
                  {items.map((r, i) => (
                    <div key={i} onClick={onClose} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 18px", cursor:"pointer", borderBottom:"1px solid var(--crm-border)", transition:"background .1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--crm-bg3)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width:32, height:32, borderRadius:8, background:r.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{r.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:"var(--crm-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title}</div>
                        <div style={{ fontSize:11, color:"var(--crm-text3)", marginTop:1 }}>{r.sub}</div>
                      </div>
                      <span className="crm-badge crm-badge-blue" style={{ fontSize:9, flexShrink:0 }}>{type}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
