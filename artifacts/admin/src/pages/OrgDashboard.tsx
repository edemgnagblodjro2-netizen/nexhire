import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  fetchMyOrganisation,
  fetchMyStats,
  openBillingPortal,
  startCheckout,
  type Organisation,
  type Subscription,
  type StatsResponse,
} from "@/lib/orgApi";
import { clearOrgToken } from "@/lib/orgAuth";
import {
  fetchVerificationStatus,
  submitVerificationRequest,
  type VerificationStatus,
} from "@/lib/orgApi";

const PLAN_LABELS: Record<string, { label: string; price: string; color: string }> = {
  standard: { label: "Standard", price: "39 $/mois", color: "from-blue-500 to-blue-600" },
  plus: { label: "Plus", price: "89 $/mois", color: "from-violet-500 to-fuchsia-600" },
  terrain: { label: "Terrain", price: "19 $/mois", color: "from-sky-500 to-cyan-600" },
  institution: { label: "Institution", price: "199 $/mois", color: "from-purple-600 to-fuchsia-700" },
};

type PlanBenefit = { icon: string; title: string; desc: string };

const PLAN_BENEFITS: Record<string, { tagline: string; benefits: PlanBenefit[]; upsell?: { plan: string; reason: string } }> = {
  standard: {
    tagline: "Visibilité de base pour votre organisme",
    benefits: [
      { icon: "📋", title: "Profil organisme", desc: "Logo, photos, horaires, coordonnées complètes" },
      { icon: "✓", title: "Badge « Vérifié »", desc: "Rassurez les utilisateurs vulnérables" },
      { icon: "📊", title: "Statistiques 30 j", desc: "Vues, appels et clics sur votre profil" },
      { icon: "📞", title: "Appels directs", desc: "Les utilisateurs vous contactent en un clic" },
    ],
    upsell: { plan: "Plus (89 $/mois)", reason: "Mise en avant prioritaire dans les résultats + alertes urgentes" },
  },
  plus: {
    tagline: "Mise en avant maximale + alertes prioritaires",
    benefits: [
      { icon: "⭐", title: "Mise en avant", desc: "Vos services apparaissent en priorité dans les résultats" },
      { icon: "🚨", title: "Alertes prioritaires", desc: "Notifications instantanées pour les besoins urgents dans votre secteur" },
      { icon: "📋", title: "Profil complet", desc: "Logo, photos, horaires, badges Vérifié" },
      { icon: "📊", title: "Statistiques avancées", desc: "Vues, appels, clics, taux de conversion" },
      { icon: "🎯", title: "Catégorisation fine", desc: "Apparaissez sur plusieurs segments pertinents" },
    ],
  },
  terrain: {
    tagline: "L'outil quotidien des intervenants terrain",
    benefits: [
      { icon: "💬", title: "Chat IA illimité", desc: "Multilingue (FR · EN · ES · AR · HT), saisie vocale" },
      { icon: "👥", title: "Dossiers clients privés", desc: "Notes confidentielles par usager, historique complet" },
      { icon: "⭐", title: "Favoris par client", desc: "Listes de services personnalisées par dossier" },
      { icon: "📤", title: "Partage rapide", desc: "Envoyez un service par SMS, courriel ou WhatsApp" },
      { icon: "🚨", title: "Détection de crise", desc: "Priorité aux situations suicide / violence / DPJ" },
    ],
    upsell: { plan: "Institution (199 $/mois)", reason: "Partagez les dossiers entre intervenants de votre équipe + RDV partagés" },
  },
  institution: {
    tagline: "L'infrastructure essentielle du réseau communautaire québécois",
    benefits: [
      { icon: "👥", title: "Dossiers partagés en équipe", desc: "Toute l'équipe accède aux mêmes dossiers clients" },
      { icon: "🔍", title: "Recherche client globale", desc: "Par nom, téléphone ou adresse, sur toute l'organisation" },
      { icon: "📅", title: "Calendrier partagé", desc: "RDV de toute l'équipe centralisés" },
      { icon: "📝", title: "Notes de suivi chronologiques", desc: "Contacts, RDV, alertes par client" },
      { icon: "💬", title: "Chat IA illimité", desc: "Tout l'équipe profite de l'IA multilingue" },
      { icon: "🚨", title: "Détection de crise prioritaire", desc: "Alertes routées au membre disponible" },
      { icon: "🔮", title: "Bientôt", desc: "Référencement chiffré entre organismes + dashboard d'impact mensuel" },
    ],
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: "Période d'essai", color: "bg-amber-100 text-amber-700" },
  active: { label: "Actif", color: "bg-green-100 text-green-700" },
  past_due: { label: "Paiement en retard", color: "bg-red-100 text-red-700" },
  canceled: { label: "Annulé", color: "bg-gray-100 text-gray-700" },
  incomplete: { label: "Incomplet", color: "bg-amber-100 text-amber-700" },
  unpaid: { label: "Impayé", color: "bg-red-100 text-red-700" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function daysLeft(d: string | null) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function OrgDashboard() {
  const [, setLocation] = useLocation();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [verif, setVerif] = useState<VerificationStatus | null>(null);
  const [showVerifForm, setShowVerifForm] = useState(false);
  const [verifSubmitting, setVerifSubmitting] = useState(false);
  const [verifError, setVerifError] = useState<string | null>(null);
  const [verifForm, setVerifForm] = useState({
    neq: "",
    arcCharityNumber: "",
    legalName: "",
    foundedYear: "",
    contactPhone: "",
    website: "",
    mission: "",
  });

  async function reloadVerif() {
    try {
      const v = await fetchVerificationStatus();
      setVerif(v);
    } catch {
      /* silent */
    }
  }

  async function handleVerifSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifError(null);
    setVerifSubmitting(true);
    try {
      const r = await submitVerificationRequest({
        neq: verifForm.neq.trim(),
        arcCharityNumber: verifForm.arcCharityNumber.trim() || undefined,
        legalName: verifForm.legalName.trim(),
        foundedYear: verifForm.foundedYear.trim(),
        contactPhone: verifForm.contactPhone.trim(),
        website: verifForm.website.trim() || undefined,
        mission: verifForm.mission.trim(),
      });
      alert(r.message);
      setShowVerifForm(false);
      await reloadVerif();
      // Also reload org to reflect new badge
      try {
        const fresh = await fetchMyOrganisation();
        setOrg(fresh.organisation);
      } catch { /* silent */ }
    } catch (err: any) {
      setVerifError(err.message || "Erreur lors de la soumission.");
    } finally {
      setVerifSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgData, statsData] = await Promise.all([
          fetchMyOrganisation(),
          fetchMyStats(30),
        ]);
        if (cancelled) return;
        setOrg(orgData.organisation);
        setSub(orgData.subscription);
        setStats(statsData);
        // Fetch verification status (best-effort)
        try {
          const v = await fetchVerificationStatus();
          if (!cancelled) setVerif(v);
        } catch { /* silent */ }
      } catch (err: any) {
        if (cancelled) return;
        if (err.message === "UNAUTHORIZED") {
          clearOrgToken();
          setLocation("/organisme/login");
          return;
        }
        if (err.message === "NOT_ORGANISM") {
          setError("Aucun organisme n'est associé à ce compte.");
        } else {
          setError(err.message || "Erreur de chargement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setLocation]);

  function handleLogout() {
    clearOrgToken();
    setLocation("/organisme/login");
  }

  async function handleManageSub() {
    if (!org) return;
    setActionLoading(true);
    try {
      if (sub?.stripeCustomerId) {
        const url = await openBillingPortal(org.id);
        window.location.href = url;
      } else {
        const url = await startCheckout(org.id, org.email || "", sub?.plan || "standard", "monthly");
        window.location.href = url;
      }
    } catch (err: any) {
      alert(err.message || "Erreur ouverture du portail.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Impossible de charger le tableau de bord</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={handleLogout} className="text-sm text-blue-600 font-medium">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  if (!org) return null;

  const planKey = sub?.plan || "standard";
  const planInfo = PLAN_LABELS[planKey] || PLAN_LABELS.standard;
  const planBenefits = PLAN_BENEFITS[planKey] || PLAN_BENEFITS.standard;
  const statusInfo = STATUS_LABELS[sub?.status || "trialing"] || { label: sub?.status || "—", color: "bg-gray-100 text-gray-700" };
  const trialDays = daysLeft(sub?.trialEnd ?? null);
  const totals = stats?.totals || { views: 0, calls: 0, clicks: 0 };

  // Build grouped daily series for a tiny bar chart
  const dailyMap = new Map<string, { views: number; calls: number; clicks: number }>();
  for (const row of stats?.daily || []) {
    const e = dailyMap.get(row.date) || { views: 0, calls: 0, clicks: 0 };
    if (row.action === "view") e.views = row.count;
    if (row.action === "call") e.calls = row.count;
    if (row.action === "click") e.clicks = row.count;
    dailyMap.set(row.date, e);
  }
  const dailyEntries = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const maxDay = dailyEntries.reduce((m, [, v]) => Math.max(m, v.views + v.calls + v.clicks), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white">
              🏢
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{org.name}</p>
              <p className="text-xs text-gray-400">Espace organisme · AttenteZéro</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Top status banner */}
        <div className={`rounded-2xl p-6 bg-gradient-to-r ${planInfo.color} text-white shadow-lg`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-md">
                  Forfait {planInfo.label}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                {org.badgeVerified && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white/20">
                    ✓ Vérifié
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold mb-1">{planInfo.price}</p>
              {sub?.status === "trialing" && trialDays !== null && (
                <p className="text-sm text-white/85">
                  Essai gratuit&nbsp;: {trialDays} jour{trialDays > 1 ? "s" : ""} restant{trialDays > 1 ? "s" : ""} (jusqu'au {formatDate(sub.trialEnd)})
                </p>
              )}
              {sub?.status === "active" && sub.currentPeriodEnd && (
                <p className="text-sm text-white/85">
                  Prochain renouvellement&nbsp;: {formatDate(sub.currentPeriodEnd)}
                </p>
              )}
            </div>
            <button
              onClick={handleManageSub}
              disabled={actionLoading}
              className="bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition shadow"
            >
              {actionLoading ? "Ouverture…" : sub?.stripeCustomerId ? "Gérer mon abonnement" : "Activer mon paiement"}
            </button>
          </div>
        </div>

        {/* ── Badge Vérifié ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${verif?.isVerified ? "bg-emerald-100" : "bg-gray-100"}`}>
                {verif?.isVerified ? "✓" : "🛡️"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Badge Vérifié{" "}
                  {verif?.isVerified && (
                    <span className="ml-1 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">ACTIF</span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {verif?.isVerified
                    ? "Votre organisme est officiellement vérifié."
                    : "Rassurez les usagers vulnérables avec un badge officiel."}
                </p>
              </div>
            </div>
          </div>

          {verif === null && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
              Chargement du statut de vérification…
            </div>
          )}

          {verif && !verif.eligibleForRequest && !verif.isVerified && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Forfait payant requis.</strong> Le badge Vérifié est réservé aux abonnements actifs (Standard, Plus, Terrain ou Institution). <button onClick={handleManageSub} className="underline font-semibold">Gérer mon abonnement →</button>
            </div>
          )}

          {verif?.eligibleForRequest && !verif.isVerified && verif.latestRequest?.status === "pending" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              <strong>⏳ Demande en cours de traitement.</strong> Un administrateur la révisera sous 48 heures. Soumise le {formatDate(verif.latestRequest.createdAt)}.
            </div>
          )}

          {verif?.latestRequest?.status === "rejected" && !verif.isVerified && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 mb-3">
              <strong>Demande refusée.</strong> {verif.latestRequest.rejectionReason || "Raison non précisée."}
            </div>
          )}

          {verif?.eligibleForRequest && !verif.isVerified && verif.latestRequest?.status !== "pending" && !showVerifForm && (
            <button
              onClick={() => {
                if (verif.latestRequest?.status === "rejected") {
                  const prev = verif.latestRequest;
                  setVerifForm({
                    neq: prev.neq || "",
                    arcCharityNumber: prev.arcCharityNumber || "",
                    legalName: prev.legalName || "",
                    foundedYear: prev.foundedYear || "",
                    contactPhone: prev.contactPhone || "",
                    website: prev.website || "",
                    mission: prev.mission || "",
                  });
                }
                setShowVerifForm(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
            >
              {verif.latestRequest?.status === "rejected" ? "Refaire une demande" : "Demander le badge Vérifié"}
            </button>
          )}

          {verif?.isVerified && verif.latestRequest?.expiresAt && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
              ✓ Badge actif jusqu'au <strong>{formatDate(verif.latestRequest.expiresAt)}</strong> — un rappel vous sera envoyé avant l'expiration.
            </div>
          )}

          {showVerifForm && (
            <form onSubmit={handleVerifSubmit} className="space-y-3 mt-2">
              {verif?.latestRequest?.status === "rejected" && verif.latestRequest.rejectionReason && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <span className="font-semibold">Motif du refus précédent&nbsp;:</span>{" "}
                  {verif.latestRequest.rejectionReason}
                  <div className="mt-1 text-amber-700 text-xs">Corrigez les informations ci-dessous avant de soumettre à nouveau.</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="NEQ (Quebec) *" hint="10 chiffres — Registraire des entreprises">
                  <input
                    required
                    maxLength={10}
                    value={verifForm.neq}
                    onChange={(e) => setVerifForm({ ...verifForm, neq: e.target.value.replace(/\D/g, "") })}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                  />
                </Field>
                <Field label="N° ARC organisme de bienfaisance" hint="Format : 123456789RR0001 (recommandé pour auto-approbation)">
                  <input
                    maxLength={15}
                    value={verifForm.arcCharityNumber}
                    onChange={(e) => setVerifForm({ ...verifForm, arcCharityNumber: e.target.value.toUpperCase() })}
                    placeholder="123456789RR0001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                  />
                </Field>
                <Field label="Nom légal complet *">
                  <input required value={verifForm.legalName} onChange={(e) => setVerifForm({ ...verifForm, legalName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </Field>
                <Field label="Année de fondation *" hint="Min. 12 mois d'existence">
                  <input required maxLength={4} value={verifForm.foundedYear} onChange={(e) => setVerifForm({ ...verifForm, foundedYear: e.target.value.replace(/\D/g, "") })} placeholder="2020" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </Field>
                <Field label="Téléphone de contact *">
                  <input required value={verifForm.contactPhone} onChange={(e) => setVerifForm({ ...verifForm, contactPhone: e.target.value })} placeholder="514 555-1234" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </Field>
                <Field label="Site web officiel">
                  <input type="url" value={verifForm.website} onChange={(e) => setVerifForm({ ...verifForm, website: e.target.value })} placeholder="https://" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </Field>
              </div>
              <Field label="Mission de l'organisme *" hint="2-3 phrases">
                <textarea required rows={3} value={verifForm.mission} onChange={(e) => setVerifForm({ ...verifForm, mission: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </Field>
              {verifError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{verifError}</div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={verifSubmitting} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm">
                  {verifSubmitting ? "Envoi…" : "Envoyer la demande"}
                </button>
                <button type="button" onClick={() => setShowVerifForm(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Plan benefits ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Avantages de votre forfait <span className="text-blue-600">{planInfo.label}</span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">{planBenefits.tagline}</p>
            </div>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold bg-gray-50 px-3 py-1.5 rounded-md">
              {planInfo.price}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planBenefits.benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-2xl leading-none flex-shrink-0">{b.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {planBenefits.upsell && (
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="text-xl flex-shrink-0">💡</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Passer à <span className="text-amber-700">{planBenefits.upsell.plan}</span> ?
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{planBenefits.upsell.reason}</p>
                </div>
                <button
                  onClick={handleManageSub}
                  disabled={actionLoading}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg bg-white border border-amber-200 disabled:opacity-50 flex-shrink-0"
                >
                  Découvrir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="👁️" label="Vues du profil" value={totals.views} color="text-blue-600" />
          <StatCard icon="📞" label="Appels téléphoniques" value={totals.calls} color="text-emerald-600" />
          <StatCard icon="🌐" label="Visites du site web" value={totals.clicks} color="text-violet-600" />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Activité (30 derniers jours)</h3>
              <p className="text-xs text-gray-500">Vues, appels et clics combinés par jour</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"/>Vues</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Appels</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500"/>Clics</span>
            </div>
          </div>
          {dailyEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {stats?.message || "Aucune activité enregistrée pour le moment."}
            </div>
          ) : (
            <div className="flex items-end gap-1 h-48 border-b border-gray-100 pb-1">
              {dailyEntries.map(([date, v]) => {
                const total = v.views + v.calls + v.clicks;
                const heightPct = (total / maxDay) * 100;
                return (
                  <div key={date} className="flex-1 flex flex-col justify-end group relative" title={`${date}: ${total}`}>
                    <div className="flex flex-col w-full" style={{ height: `${heightPct}%`, minHeight: total > 0 ? 2 : 0 }}>
                      {v.views > 0 && <div className="bg-blue-500 w-full" style={{ height: `${(v.views / total) * 100}%` }} />}
                      {v.calls > 0 && <div className="bg-emerald-500 w-full" style={{ height: `${(v.calls / total) * 100}%` }} />}
                      {v.clicks > 0 && <div className="bg-violet-500 w-full" style={{ height: `${(v.clicks / total) * 100}%` }} />}
                    </div>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {new Date(date).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })} · {total}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Org info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Coordonnées de l'organisme</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Nom" value={org.name} />
            <InfoRow label="Personne contact" value={org.contactName} />
            <InfoRow label="Courriel" value={org.email} />
            <InfoRow label="Téléphone" value={org.phone} />
            <InfoRow label="Site web" value={org.website} />
            <InfoRow label="Ville" value={org.city} />
            <InfoRow label="Adresse" value={org.address} />
            <InfoRow label="Service lié" value={org.serviceId ? `#${org.serviceId.slice(0, 8)}…` : "À assigner par un administrateur"} />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Pour modifier vos coordonnées, contactez l'équipe AttenteZéro à <a href="mailto:contact@attentezero.ca" className="text-blue-600">contact@attentezero.ca</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">30 j</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString("fr-CA")}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-sm text-gray-900 break-words">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}
