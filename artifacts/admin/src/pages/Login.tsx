import { useState } from "react";
import { fetchMeta } from "@/lib/api";
import { storeKey, type AdminRole } from "@/lib/auth";

const API_BASE = "";

async function probeB2GKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/b2g/regions`, {
      headers: { "x-admin-key": key },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function Login({
  onLogin,
}: {
  onLogin: (key: string, role: AdminRole) => void;
}) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    const trimmed = key.trim();
    try {
      await fetchMeta(trimmed);
      storeKey(trimmed, "superadmin");
      onLogin(trimmed, "superadmin");
      return;
    } catch (err: any) {
      const isUnauth =
        err.message?.includes("401") || err.message === "UNAUTHORIZED";
      if (!isUnauth) {
        setError("Impossible de joindre le serveur. Réessayez.");
        setLoading(false);
        return;
      }
    }

    const b2gOk = await probeB2GKey(trimmed);
    if (b2gOk) {
      storeKey(trimmed, "b2g");
      onLogin(trimmed, "b2g");
      return;
    }

    setError("Clé invalide. Vérifiez votre clé d'accès.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AttenteZéro</h1>
          <p className="text-teal-200 mt-1 text-sm">Panneau d'administration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Clé d'accès
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              {loading ? "Vérification…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
