import { useEffect, useState } from "react";
import type { Service } from "@/lib/api";
import { createService, updateService } from "@/lib/api";

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

  useEffect(() => {
    setForm(service ?? { ...EMPTY, id: `svc-${Date.now()}` });
    setError(null);
  }, [service]);

  function set<K extends keyof Service>(key: K, val: Service[K]) {
    setForm((f) => ({ ...f, [key]: val }));
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
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
            onClick={onClose}
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
