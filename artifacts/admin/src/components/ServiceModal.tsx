import { useEffect, useRef, useState } from "react";
import type { Service, AISuggestion } from "@/lib/api";
import { createService, updateService, aiSuggestService } from "@/lib/api";

const EMPTY: Partial<Service> = {
  id: "",
  name: "",
  category: "",
  subcategory: "",
  city: "",
  phone: "",
  website: "",
  description: "",
  address: null,
  hours: null,
  isUrgent: false,
  isProvinceWide: false,
  lat: null,
  lng: null,
  active: true,
};

const CITIES = ["Trois-Rivières", "Shawinigan", "Drummondville", "Victoriaville", "Province"];
const CATEGORIES = [
  "housing", "food", "mentalHealth", "health", "immigration",
  "employment", "family", "social", "childcare", "realestate",
  "legal", "administrative",
];

interface Props {
  adminKey: string;
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ServiceModal({ adminKey, service, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Service>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!service;

  // ── AI pre-fill state ──
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AISuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiElapsed, setAiElapsed] = useState(0);
  const aiAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setForm(service ?? { ...EMPTY, id: `svc-${Date.now()}` });
    setError(null);
    setAiQuery("");
    setAiResult(null);
    setAiError(null);
  }, [service]);

  // Abort any in-flight AI request when modal unmounts
  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

  function handleClose() {
    aiAbortRef.current?.abort();
    onClose();
  }

  // Tick elapsed seconds while AI is loading (for UX)
  useEffect(() => {
    if (!aiLoading) return;
    setAiElapsed(0);
    const start = Date.now();
    const t = setInterval(() => setAiElapsed(Math.round((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [aiLoading]);

  function set<K extends keyof Service>(key: K, val: Service[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function cancelAiSuggest() {
    aiAbortRef.current?.abort();
  }

  async function handleAiSuggest() {
    const q = aiQuery.trim();
    if (!q || q.length < 3) {
      setAiError("Tape au moins 3 caractères (ex: « Maison de la Famille Verdun »).");
      return;
    }
    if (q.length > 200) {
      setAiError("Trop long (max 200 caractères).");
      return;
    }
    // Abort any previous in-flight request before starting a new one
    aiAbortRef.current?.abort();
    const ac = new AbortController();
    aiAbortRef.current = ac;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const sugg = await aiSuggestService(
        adminKey,
        q,
        { city: form.city || undefined },
        ac.signal,
      );
      // Don't apply if the user already aborted (e.g. closed modal)
      if (ac.signal.aborted) return;
      setAiResult(sugg);
      // Pre-fill the form, but keep the existing id
      setForm((f) => ({
        ...f,
        name: sugg.name || f.name,
        category: sugg.category || f.category,
        subcategory: sugg.subcategory || f.subcategory,
        city: sugg.city || f.city,
        phone: sugg.phone || f.phone,
        website: sugg.website || f.website,
        address: sugg.address || f.address,
        description: sugg.description || f.description,
        isProvinceWide: sugg.isProvinceWide ?? f.isProvinceWide,
      }));
    } catch (err: any) {
      if (err?.name === "AbortError" || ac.signal.aborted) {
        setAiError("Recherche annulée.");
      } else {
        setAiError(err?.message || "Erreur lors de la recherche IA.");
      }
    } finally {
      if (aiAbortRef.current === ac) aiAbortRef.current = null;
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name?.trim() || !form.category?.trim()) {
      setError("Le nom et la catégorie sont requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateService(adminKey, service!.id, form);
      } else {
        await createService(adminKey, form);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Modifier le service" : "Nouveau service"}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isEdit && (
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪄</span>
                <h3 className="text-sm font-semibold text-purple-900">
                  Pré-remplir avec l'IA
                </h3>
                <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  recherche web
                </span>
              </div>
              <p className="text-xs text-purple-800">
                Tape le nom de l'organisme + ville. L'IA cherche sur le web et remplit le formulaire.
              </p>
              <div className="flex gap-2">
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !aiLoading) {
                      e.preventDefault();
                      handleAiSuggest();
                    }
                  }}
                  disabled={aiLoading}
                  placeholder="ex: Maison de la Famille de Verdun, Montréal"
                  className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {aiLoading ? (
                  <button
                    onClick={cancelAiSuggest}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded-xl transition whitespace-nowrap"
                  >
                    ✕ Annuler ({aiElapsed}s)
                  </button>
                ) : (
                  <button
                    onClick={handleAiSuggest}
                    disabled={!aiQuery.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition whitespace-nowrap"
                  >
                    🔍 Chercher
                  </button>
                )}
              </div>
              {aiLoading && (
                <p className="text-xs text-purple-700 italic">
                  ⏳ Patience, ça prend généralement 30-60 secondes (l'IA lit plusieurs sites web).
                </p>
              )}
              {aiError && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                  ⚠️ {aiError}
                </div>
              )}
              {aiResult && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        aiResult.confidence === "high"
                          ? "bg-green-100 text-green-800"
                          : aiResult.confidence === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      Fiabilité : {aiResult.confidence}
                    </span>
                    {aiResult.mode === "fallback_no_web" && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold">
                        ⚠️ Sans recherche web
                      </span>
                    )}
                  </div>
                  {aiResult.warnings.length > 0 && (
                    <ul className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 list-disc pl-5 space-y-0.5">
                      {aiResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {aiResult.sources.length > 0 && (
                    <div>
                      <p className="text-purple-900 font-medium mb-1">📚 Sources à vérifier :</p>
                      <ul className="space-y-0.5">
                        {aiResult.sources.map((s, i) => (
                          <li key={i}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-700 hover:text-purple-900 underline truncate block"
                            >
                              {s.title || s.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-purple-700 italic pt-1">
                    ✏️ Vérifie chaque champ ci-dessous, corrige si besoin, puis clique « Créer ».
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="ID" required disabled={isEdit}>
              <input
                value={form.id ?? ""}
                onChange={(e) => set("id", e.target.value)}
                disabled={isEdit}
                className="input"
                placeholder="svc-unique-id"
              />
            </Field>
            <Field label="Nom" required>
              <input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                className="input"
                placeholder="Nom du service"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie" required>
              <select
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className="input"
              >
                <option value="">Choisir…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Sous-catégorie">
              <input
                value={form.subcategory ?? ""}
                onChange={(e) => set("subcategory", e.target.value)}
                className="input"
                placeholder="ex: Logement d'urgence"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ville">
              <select
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                className="input"
              >
                <option value="">Choisir…</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Téléphone">
              <input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                className="input"
                placeholder="819-000-0000"
              />
            </Field>
          </div>

          <Field label="Site web">
            <input
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value)}
              className="input"
              placeholder="https://..."
            />
          </Field>

          <Field label="Adresse">
            <input
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value || null)}
              className="input"
              placeholder="123 rue Exemple, Ville"
            />
          </Field>

          <Field label="Horaire">
            <input
              value={form.hours ?? ""}
              onChange={(e) => set("hours", e.target.value || null)}
              className="input"
              placeholder="Lun-Ven 9h-17h"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              className="input min-h-24 resize-y"
              placeholder="Description du service…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="any"
                value={form.lat ?? ""}
                onChange={(e) => set("lat", e.target.value ? Number(e.target.value) : null)}
                className="input"
                placeholder="46.3497"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="any"
                value={form.lng ?? ""}
                onChange={(e) => set("lng", e.target.value ? Number(e.target.value) : null)}
                className="input"
                placeholder="-72.5722"
              />
            </Field>
          </div>

          <div className="flex gap-6">
            <Toggle
              label="Urgent"
              checked={form.isUrgent ?? false}
              onChange={(v) => set("isUrgent", v)}
            />
            <Toggle
              label="À l'échelle provinciale"
              checked={form.isProvinceWide ?? false}
              onChange={(v) => set("isProvinceWide", v)}
            />
            <Toggle
              label="Actif"
              checked={form.active ?? true}
              onChange={(v) => set("active", v)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {saving ? "Sauvegarde…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  disabled,
  children,
}: {
  label: string;
  required?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-teal-500" : "bg-gray-200"
        } relative flex items-center`}
      >
        <div
          className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
