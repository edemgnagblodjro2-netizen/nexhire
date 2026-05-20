import { useState } from "react";

interface CalEvent {
  id: number; day: number; title: string; time: string;
  color: string; contact: string; type: string;
}

const EVENTS: CalEvent[] = [
  { id:1,  day:2,  title:"Démo ERP — Groupe LSC",          time:"10h00", color:"#3B6EF5", contact:"Kevin L.",    type:"Réunion"    },
  { id:2,  day:2,  title:"Appel suivi — Immo 3R",           time:"14h30", color:"#0FD4A0", contact:"Sophie L.",   type:"Appel"      },
  { id:3,  day:5,  title:"Proposition AttenteZéro",          time:"11h00", color:"#F5A623", contact:"Ville Vic.",  type:"Proposition" },
  { id:4,  day:7,  title:"Réunion équipe commerciale",       time:"09h00", color:"#9B6DF5", contact:"Équipe",      type:"Interne"    },
  { id:5,  day:8,  title:"Négociation — Constructions Roy",  time:"13h30", color:"#F55656", contact:"Anthony M.",  type:"Négociation" },
  { id:6,  day:12, title:"Démo CRM — CÉGEP TR",             time:"10h00", color:"#3B6EF5", contact:"Lucie B.",    type:"Réunion"    },
  { id:7,  day:14, title:"Suivi contrat — Construction Beau",time:"15h00", color:"#0FD4A0", contact:"Marc T.",     type:"Appel"      },
  { id:8,  day:15, title:"Formation équipe vente",           time:"09h00", color:"#9B6DF5", contact:"Équipe",      type:"Formation"  },
  { id:9,  day:17, title:"Renouvellement Clinique Santé",    time:"11h30", color:"#F5A623", contact:"Nadia B.",    type:"Appel"      },
  { id:10, day:19, title:"Signature contrat Transport Mau.", time:"14h00", color:"#22C87A", contact:"Transport M.", type:"Contrat"   },
  { id:11, day:20, title:"Point mensuel Q2",                 time:"10h00", color:"#9B6DF5", contact:"Direction",   type:"Interne"   },
  { id:12, day:22, title:"Démo Site web — Boutique Marie",   time:"13h00", color:"#3B6EF5", contact:"Chez Marie",  type:"Réunion"   },
  { id:13, day:22, title:"Appel découverte — Nouveau lead",  time:"16h00", color:"#38C9F5", contact:"Lead entrant",type:"Appel"     },
  { id:14, day:25, title:"Revue pipeline Q2",                time:"09h00", color:"#9B6DF5", contact:"Équipe",      type:"Interne"   },
  { id:15, day:28, title:"Clôture deal — Tech Solutions",    time:"11h00", color:"#22C87A", contact:"Tech Sol. QC",type:"Contrat"   },
];

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const TODAY = 20;
const FIRST_DOW = 3; // May 2026 starts on Friday = index 4 (0=Lun), so offset=4
const DAYS_IN_MONTH = 31;

type ViewMode = "month" | "week" | "list";

export function CalendrierModule() {
  const [view, setView] = useState<ViewMode>("month");
  const [month, setMonth] = useState(4); // Mai 2026
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  const offset = 3; // May 1 2026 = Thursday → Lun=0, index=3
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsFor(day: number) {
    return EVENTS.filter(e => e.day === day);
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:6 }}>
          <button className="crm-btn crm-btn-ghost" style={{ padding:"6px 10px" }} onClick={() => setMonth(m => Math.max(0, m-1))}>‹</button>
          <span style={{ fontWeight:700, fontSize:16, color:"var(--crm-text)", padding:"0 8px", alignSelf:"center" }}>
            {MONTHS[month]} 2026
          </span>
          <button className="crm-btn crm-btn-ghost" style={{ padding:"6px 10px" }} onClick={() => setMonth(m => Math.min(11, m+1))}>›</button>
        </div>
        <button className="crm-btn crm-btn-ghost" style={{ fontSize:12 }}>Aujourd'hui</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {(["month","week","list"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`crm-btn ${view===v?"crm-btn-primary":"crm-btn-ghost"}`}
              style={{ fontSize:12, textTransform:"capitalize" }}>
              {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Liste"}
            </button>
          ))}
        </div>
        <button className="crm-btn crm-btn-primary" style={{ fontSize:12 }} onClick={() => setShowModal(true)}>
          + Nouvel événement
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { val:EVENTS.length, lbl:"Événements ce mois", c:"#3B6EF5" },
          { val:EVENTS.filter(e=>e.type==="Réunion").length,  lbl:"Réunions", c:"#3B6EF5" },
          { val:EVENTS.filter(e=>e.type==="Appel").length,    lbl:"Appels",   c:"#0FD4A0" },
          { val:EVENTS.filter(e=>e.type==="Contrat").length,  lbl:"Contrats", c:"#22C87A" },
          { val:EVENTS.filter(e=>e.type==="Interne").length,  lbl:"Internes", c:"#9B6DF5" },
        ].map(s => (
          <div key={s.lbl} className="crm-stat-mini" style={{ flex:1, minWidth:90 }}>
            <div className="crm-stat-val" style={{ color:s.c, fontSize:18 }}>{s.val}</div>
            <div className="crm-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {view === "month" && (
        <div className="crm-table-card" style={{ overflow:"visible" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid var(--crm-border)" }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:600, color:"var(--crm-text3)", letterSpacing:1, textTransform:"uppercase" }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {cells.map((day, i) => {
              const dayEvents = day ? eventsFor(day) : [];
              const isToday = day === TODAY;
              const isWeekend = i % 7 >= 5;
              return (
                <div key={i} style={{
                  minHeight:90, padding:"6px 6px 4px",
                  borderRight: i % 7 < 6 ? "1px solid var(--crm-border)" : "none",
                  borderBottom: i < cells.length - 7 ? "1px solid var(--crm-border)" : "none",
                  background: !day ? "rgba(0,0,0,0.08)" : isWeekend ? "rgba(255,255,255,0.01)" : "transparent",
                }}>
                  {day && (
                    <>
                      <div style={{
                        width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight: isToday ? 700 : 400,
                        color: isToday ? "#fff" : "var(--crm-text2)",
                        background: isToday ? "#3B6EF5" : "transparent",
                        marginBottom:4,
                      }}>{day}</div>
                      {dayEvents.slice(0,2).map(ev => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          style={{
                            background: ev.color + "22", borderLeft:`2px solid ${ev.color}`,
                            borderRadius:4, padding:"2px 5px", marginBottom:2,
                            fontSize:10, color:"var(--crm-text)", cursor:"pointer",
                            overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
                          }}>
                          <span style={{ color:ev.color, fontWeight:600 }}>{ev.time}</span> {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div style={{ fontSize:10, color:"var(--crm-text3)", paddingLeft:4 }}>+{dayEvents.length-2} autres</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="crm-table-card">
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead><tr>
                <th>Date</th><th>Heure</th><th>Événement</th><th>Contact</th><th>Type</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {EVENTS.sort((a,b) => a.day - b.day).map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontSize:12 }}>Mai {ev.day}, 2026</td>
                    <td style={{ fontSize:12, color:"var(--crm-text2)" }}>{ev.time}</td>
                    <td style={{ fontWeight:500, fontSize:13 }}>{ev.title}</td>
                    <td style={{ fontSize:12, color:"var(--crm-text2)" }}>{ev.contact}</td>
                    <td><span className="crm-badge crm-badge-blue" style={{ fontSize:10 }}>{ev.type}</span></td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, padding:"3px 8px" }}>Modifier</button>
                        <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, padding:"3px 8px", color:"var(--crm-red)" }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="crm-table-card" style={{ padding:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"60px repeat(7,1fr)", gap:"0 1px" }}>
            <div />
            {["Lun 18","Mar 19","Mer 20","Jeu 21","Ven 22","Sam 23","Dim 24"].map((d, i) => (
              <div key={d} style={{
                textAlign:"center", padding:"8px 4px", fontSize:12, fontWeight:600,
                color: i === 2 ? "#3B6EF5" : "var(--crm-text3)",
                borderBottom:"1px solid var(--crm-border)",
              }}>{d}</div>
            ))}
            {[9,10,11,12,13,14,15,16,17].map(h => (
              <>
                <div key={`h${h}`} style={{ textAlign:"right", paddingRight:8, fontSize:11, color:"var(--crm-text3)", paddingTop:6 }}>{h}h</div>
                {[18,19,20,21,22,23,24].map(day => {
                  const ev = EVENTS.find(e => e.day === day && parseInt(e.time) === h);
                  return (
                    <div key={`${day}-${h}`} style={{ minHeight:50, borderBottom:"1px solid var(--crm-border)", borderLeft:"1px solid var(--crm-border)", padding:2, position:"relative" }}>
                      {ev && (
                        <div style={{ background:ev.color+"22", borderLeft:`2px solid ${ev.color}`, borderRadius:4, padding:"4px 6px", fontSize:10, color:"var(--crm-text)" }}>
                          {ev.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="crm-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="crm-modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <div style={{ width:10, height:10, borderRadius:"50%", background:selectedEvent.color, flexShrink:0 }} />
              <span className="crm-modal-title">{selectedEvent.title}</span>
              <button className="crm-modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div className="crm-info-row"><span className="crm-info-label">Date</span><span className="crm-info-value">Mai {selectedEvent.day}, 2026</span></div>
                <div className="crm-info-row"><span className="crm-info-label">Heure</span><span className="crm-info-value">{selectedEvent.time}</span></div>
                <div className="crm-info-row"><span className="crm-info-label">Contact</span><span className="crm-info-value">{selectedEvent.contact}</span></div>
                <div className="crm-info-row"><span className="crm-info-label">Type</span><span className={`crm-badge crm-badge-blue`}>{selectedEvent.type}</span></div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setSelectedEvent(null)}>Fermer</button>
              <button className="crm-btn crm-btn-primary">Modifier</button>
            </div>
          </div>
        </div>
      )}

      {/* New event modal */}
      {showModal && (
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-hdr">
              <span style={{ fontSize:18 }}>📅</span>
              <span className="crm-modal-title">Nouvel événement</span>
              <button className="crm-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group full"><div className="crm-form-label">Titre *</div><input className="crm-form-input" placeholder="Ex. Démo produit" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Date</div><input className="crm-form-input" type="date" defaultValue="2026-05-20" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Heure</div><input className="crm-form-input" type="time" defaultValue="10:00" /></div>
                <div className="crm-form-group"><div className="crm-form-label">Type</div><select className="crm-form-select"><option>Réunion</option><option>Appel</option><option>Contrat</option><option>Formation</option><option>Interne</option></select></div>
                <div className="crm-form-group"><div className="crm-form-label">Contact lié</div><input className="crm-form-input" placeholder="Rechercher un contact…" /></div>
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowModal(false)}>Créer l'événement</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
