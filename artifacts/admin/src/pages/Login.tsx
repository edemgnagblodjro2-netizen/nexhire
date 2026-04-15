import { useState } from "react";
import { fetchMeta } from "@/lib/api";
import { storeKey } from "@/lib/auth";

export default function Login({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await fetchMeta(key.trim());
      storeKey(key.trim());
      onLogin(key.trim());
    } catch (err: any) {
      if (err.message?.includes("401") || err.message === "UNAUTHORIZED") {
        setError("Clé invalide. Vérifiez votre clé d'accès admin.");
      } else {
        setError("Impossible de joindre le serveur. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
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
                Clé d'accès admin
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
