import { useState } from "react";

type Step = "upload" | "mapping" | "preview" | "done";

const COLUMNS = ["prénom","nom","courriel","téléphone","entreprise","statut","source","valeur","notes"];
const DEMO_ROWS = [
  ["Jean","Tremblay","jean@construction.ca","514 000-1111","Construction ABC","Prospect","LinkedIn","45000","Client potentiel ERP"],
  ["Marie","Côté","mcote@mairie.ca","819 555-2222","Ville de Granby","Lead froid","Référence","82000","Contact DGA"],
  ["Luc","Bergeron","lbergeron@immobilier.ca","450 777-3333","Immo Bergeron","Prospect chaud","Site web","28000","Intéressé par CRM"],
  ["Anne","Dupont","adupont@sante.ca","418 888-4444","Clinique Dupont","Prospect","Google Ads","15000","Suivre en juin"],
  ["Pierre","Laroche","laroche@transport.ca","819 333-5555","Transport Laroche","Négociation","Événement","67000","Réunion planifiée"],
];

export function ImportCSVModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string,string>>({
    "First Name":"prénom", "Last Name":"nom", "Email":"courriel",
    "Phone":"téléphone", "Company":"entreprise",
  });

  const csvHeaders = ["First Name","Last Name","Email","Phone","Company","Status","Source","Value","Notes"];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      setFileName(file.name);
      setStep("mapping");
    }
  }

  function simulateUpload() {
    setFileName("contacts-import.csv");
    setStep("mapping");
  }

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" style={{ width:620 }} onClick={e => e.stopPropagation()}>
        <div className="crm-modal-hdr">
          <span style={{ fontSize:20 }}>📤</span>
          <span className="crm-modal-title">Importer des contacts</span>
          {/* Steps indicator */}
          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
            {(["upload","mapping","preview","done"] as Step[]).map((s, i) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%", fontSize:10, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: step === s ? "#3B6EF5" : ["upload","mapping","preview","done"].indexOf(step) > i ? "#0FD4A0" : "var(--crm-bg4)",
                  color: step === s || ["upload","mapping","preview","done"].indexOf(step) > i ? "#fff" : "var(--crm-text3)",
                }}>
                  {["upload","mapping","preview","done"].indexOf(step) > i ? "✓" : i+1}
                </div>
                {i < 3 && <div style={{ width:20, height:1, background:"var(--crm-border)" }} />}
              </div>
            ))}
          </div>
          <button className="crm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="crm-modal-body">
          {/* Step 1 — Upload */}
          {step === "upload" && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={simulateUpload}
                style={{
                  border:`2px dashed ${dragging ? "#3B6EF5" : "var(--crm-border)"}`,
                  borderRadius:12, padding:"40px 20px", textAlign:"center",
                  background: dragging ? "rgba(59,110,245,0.08)" : "var(--crm-bg3)",
                  cursor:"pointer", transition:"all .2s",
                }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                <div style={{ fontWeight:600, fontSize:15, color:"var(--crm-text)", marginBottom:6 }}>
                  Glissez votre fichier CSV ici
                </div>
                <div style={{ fontSize:12, color:"var(--crm-text3)", marginBottom:16 }}>
                  ou cliquez pour sélectionner depuis votre ordinateur
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
                  {["CSV","XLS","XLSX"].map(f => (
                    <span key={f} className="crm-chip" style={{ fontSize:10 }}>.{f.toLowerCase()}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop:16, background:"rgba(59,110,245,0.08)", borderRadius:8, padding:"12px 16px" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--crm-text2)", marginBottom:6 }}>💡 Format attendu</div>
                <div style={{ fontSize:11, color:"var(--crm-text3)", lineHeight:1.6 }}>
                  Colonnes recommandées : Prénom, Nom, Courriel, Téléphone, Entreprise, Statut, Source, Valeur<br />
                  Première ligne = en-têtes. Encodage UTF-8 recommandé.
                </div>
                <button className="crm-btn crm-btn-ghost" style={{ fontSize:11, marginTop:8 }}>📥 Télécharger le modèle CSV</button>
              </div>
            </>
          )}

          {/* Step 2 — Mapping */}
          {step === "mapping" && (
            <>
              <div style={{ marginBottom:14, fontSize:13, color:"var(--crm-text2)" }}>
                Fichier : <strong style={{ color:"var(--crm-text)" }}>{fileName}</strong> · 247 lignes détectées
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--crm-text3)", marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>
                Associer les colonnes CSV → Champs CRM
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {csvHeaders.map(h => (
                  <div key={h} style={{ display:"grid", gridTemplateColumns:"1fr 40px 1fr", alignItems:"center", gap:8 }}>
                    <div style={{ background:"var(--crm-bg3)", borderRadius:6, padding:"7px 10px", fontSize:12, color:"var(--crm-text2)", border:"1px solid var(--crm-border)" }}>{h}</div>
                    <div style={{ textAlign:"center", color:"var(--crm-text3)", fontSize:14 }}>→</div>
                    <select
                      className="crm-form-select"
                      value={mapping[h] || ""}
                      onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                      style={{ fontSize:12 }}>
                      <option value="">— Ignorer —</option>
                      {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Preview */}
          {step === "preview" && (
            <>
              <div style={{ marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, color:"var(--crm-text2)" }}>
                  <strong style={{ color:"var(--crm-text)" }}>247 contacts</strong> prêts à importer (5 colonnes associées)
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <span className="crm-badge crm-badge-teal">✓ 241 valides</span>
                  <span className="crm-badge crm-badge-amber">⚠ 6 doublons</span>
                </div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table className="crm-table" style={{ fontSize:11 }}>
                  <thead><tr>
                    <th>Statut</th>
                    {Object.values(mapping).filter(Boolean).slice(0,5).map(c => <th key={c}>{c}</th>)}
                  </tr></thead>
                  <tbody>
                    {DEMO_ROWS.map((row, i) => (
                      <tr key={i}>
                        <td><span className={`crm-badge ${i === 2 ? "crm-badge-amber" : "crm-badge-teal"}`} style={{ fontSize:9 }}>{i === 2 ? "⚠ Doublon" : "✓ OK"}</span></td>
                        {row.slice(0,5).map((cell, j) => <td key={j}>{cell}</td>)}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={6} style={{ textAlign:"center", color:"var(--crm-text3)", fontSize:11, padding:"8px" }}>
                        … 242 autres lignes
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:12, background:"rgba(245,166,35,0.1)", borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:12, color:"#F5A623", fontWeight:600 }}>⚠ 6 doublons détectés</div>
                <div style={{ fontSize:11, color:"var(--crm-text3)", marginTop:3 }}>
                  Action pour les doublons :
                  <select className="crm-form-select" style={{ fontSize:11, marginLeft:8, display:"inline-block", width:"auto" }}>
                    <option>Ignorer (ne pas importer)</option>
                    <option>Fusionner avec l'existant</option>
                    <option>Importer quand même</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Step 4 — Done */}
          {step === "done" && (
            <div style={{ textAlign:"center", padding:"30px 20px" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <div style={{ fontWeight:700, fontSize:18, color:"var(--crm-text)", marginBottom:8 }}>Importation réussie !</div>
              <div style={{ fontSize:14, color:"var(--crm-text2)", marginBottom:20 }}>
                <strong style={{ color:"#0FD4A0" }}>241 contacts</strong> importés avec succès
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, maxWidth:300, margin:"0 auto 20px" }}>
                {[["241","Importés","#0FD4A0"],["6","Doublons ignorés","#F5A623"],["0","Erreurs","#5A5F75"]].map(([v,l,c]) => (
                  <div key={l} style={{ background:"var(--crm-bg3)", borderRadius:8, padding:"10px" }}>
                    <div style={{ fontWeight:700, fontSize:20, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:"var(--crm-text3)" }}>{l}</div>
                  </div>
                ))}
              </div>
              <button className="crm-btn crm-btn-primary" onClick={onClose} style={{ display:"inline-flex" }}>Voir les contacts importés →</button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <div className="crm-modal-footer">
            <button className="crm-btn crm-btn-ghost" onClick={() => {
              const steps: Step[] = ["upload","mapping","preview","done"];
              const idx = steps.indexOf(step);
              if (idx === 0) onClose(); else setStep(steps[idx-1]);
            }}>
              {step === "upload" ? "Annuler" : "← Retour"}
            </button>
            <button className="crm-btn crm-btn-primary" onClick={() => {
              const steps: Step[] = ["upload","mapping","preview","done"];
              const idx = steps.indexOf(step);
              if (idx < 3) setStep(steps[idx+1]);
            }}>
              {step === "preview" ? "🚀 Importer 241 contacts" : "Suivant →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
