import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/lib/auth";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://quebec-aid-finder.replit.app";

const FEATURES = [
  {
    icon: "bar-chart-2" as const,
    color: "#0e7e6e",
    bg: "#f0fdf4",
    darkBg: "#052e1c",
    title: "Suivi personnalisé",
    desc: "Tableau de bord : services favoris, statut de vos démarches, notes personnelles. Toujours à jour.",
    tag: "Nouveau",
    tagColor: "#0e7e6e",
  },
  {
    icon: "clock" as const,
    color: "#7c3aed",
    bg: "#f5f3ff",
    darkBg: "#2e1a5e",
    title: "Historique complet",
    desc: "Retrouvez tous les services consultés et les conversations IA — même hors ligne.",
    tag: null,
    tagColor: "",
  },
  {
    icon: "bell" as const,
    color: "#d97706",
    bg: "#fffbeb",
    darkBg: "#3b2006",
    title: "Alertes intelligentes",
    desc: "Soyez notifié dès qu'un nouveau service ouvre près de chez vous ou correspond à votre profil.",
    tag: "IA",
    tagColor: "#d97706",
  },
  {
    icon: "star" as const,
    color: "#e11d48",
    bg: "#fff1f2",
    darkBg: "#3b0a16",
    title: "Priorisation IA",
    desc: "Les résultats sont triés selon votre historique, votre localisation et vos besoins déclarés.",
    tag: "IA",
    tagColor: "#e11d48",
  },
];

const PLANS = [
  {
    id: "monthly" as const,
    label: "Mensuel",
    priceDisplay: "5,00 $",
    period: "/mois",
    note: null,
    highlight: false,
    savings: null,
  },
  {
    id: "annual" as const,
    label: "Annuel",
    priceDisplay: "3,75 $",
    period: "/mois",
    note: "Facturé 45 $ par an",
    highlight: true,
    savings: "Économisez 25 %",
  },
];

interface Receipt {
  customerEmail: string;
  customerName: string | null;
  amount: number;
  currency: string;
  plan: string;
  sessionId: string;
  createdAt: number;
  status: string;
}

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isFr = language !== "en";
  const isDark = colors.background === "#09090b" || colors.background === "#0a0a0a";

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Listen for deep link return from Stripe success page
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("payment-success")) {
        const parsed = Linking.parse(url);
        const sessionId = parsed.queryParams?.session_id as string | undefined;
        if (sessionId) fetchReceipt(sessionId);
      }
    });
    return () => sub.remove();
  }, []);

  async function fetchReceipt(sessionId: string) {
    try {
      const res = await fetch(
        `${API_BASE}/api/stripe/session-receipt?session_id=${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setReceipt(data);
        setShowReceipt(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (_) {}
  }

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.id,
          plan: selectedPlan,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Impossible de créer la session de paiement.");
      }
      const { url } = await res.json();

      if (Platform.OS === "web") {
        Linking.openURL(url);
      } else {
        const result = await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
          controlsColor: "#7c3aed",
          toolbarColor: "#1e40af",
        });
        if (result.type === "dismiss" || result.type === "cancel") {
          checkSubscriptionStatus();
        }
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function checkSubscriptionStatus() {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/stripe/subscription-status?email=${encodeURIComponent(user.email)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setReceipt({
            customerEmail: user.email,
            customerName: null,
            amount: selectedPlan === "annual" ? 45 : 5,
            currency: "CAD",
            plan: selectedPlan === "annual" ? "Annuel" : "Mensuel",
            sessionId: data.subscriptionId || "",
            createdAt: Date.now() / 1000,
            status: "paid",
          });
          setShowReceipt(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (_) {}
  }

  async function handleShareReceipt() {
    if (!receipt) return;
    const dateStr = new Date(receipt.createdAt * 1000).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const text = [
      "Reçu AttenteZéro Premium",
      "",
      `Montant  : ${receipt.amount} $ ${receipt.currency}`,
      `Plan     : ${receipt.plan}`,
      `Date     : ${dateStr}`,
      `Courriel : ${receipt.customerEmail}`,
      `État     : Payé ✓`,
      "",
      "Merci de votre confiance — AttenteZéro",
    ].join("\n");
    await Share.share({ message: text, title: "Reçu AttenteZéro Premium" });
  }

  return (
    <>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={["#0f0c29", "#302b63", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 12 }]}
        >
          {/* Orbs */}
          <View style={styles.orb1} />
          <View style={styles.orb2} />
          <View style={styles.orb3} />

          <View style={styles.headerRow}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.back(); }}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <View style={styles.headerBadge}>
              <Feather name="star" size={12} color="#fbbf24" />
              <Text style={styles.headerBadgeText}>PREMIUM</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {isFr ? "Passez à la version\navancée" : "Upgrade to\nadvanced"}
            </Text>
            <Text style={styles.headerSub}>
              {isFr
                ? "Paiement sécurisé par Stripe · Annulable à tout moment"
                : "Secured by Stripe · Cancel anytime"}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* ── Plan selector ── */}
          <View style={styles.plansRow}>
            {PLANS.map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedPlan(plan.id);
                  }}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: active ? "#7c3aed" : colors.card,
                      borderColor: active ? "#7c3aed" : colors.border,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                >
                  {plan.savings && (
                    <View style={[styles.savingsBadge, { backgroundColor: active ? "#fbbf24" : "#7c3aed" }]}>
                      <Text style={[styles.savingsBadgeText, { color: active ? "#1e1b4b" : "#fff" }]}>
                        {plan.savings}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, { color: active ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                    {plan.label}
                  </Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, { color: active ? "#fff" : colors.foreground }]}>
                      {plan.priceDisplay}
                    </Text>
                    <Text style={[styles.planPeriod, { color: active ? "rgba(255,255,255,0.65)" : colors.mutedForeground }]}>
                      {plan.period}
                    </Text>
                  </View>
                  {plan.note && (
                    <Text style={[styles.planNote, { color: active ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                      {plan.note}
                    </Text>
                  )}
                  {active && (
                    <View style={styles.planCheckWrap}>
                      <Feather name="check-circle" size={18} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Subscribe button ── */}
          <Pressable
            onPress={handleSubscribe}
            disabled={loading}
            style={({ pressed }) => [styles.subscribeBtn, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={["#6d28d9", "#7c3aed", "#a21caf"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribeBtnGrad}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.subscribeBtnText}>Connexion à Stripe…</Text>
                </>
              ) : (
                <>
                  <Feather name="lock" size={17} color="#fff" />
                  <Text style={styles.subscribeBtnText}>
                    {isFr ? "Payer maintenant avec Stripe" : "Pay now with Stripe"}
                  </Text>
                  <Feather name="arrow-right" size={17} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Error state */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#fff1f2", borderColor: "#fecdd3" }]}>
              <Feather name="alert-circle" size={16} color="#e11d48" />
              <Text style={[styles.errorText, { color: "#be123c" }]}>{error}</Text>
            </View>
          )}

          {/* ── Trust row ── */}
          <View style={[styles.trustRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "shield" as const, label: "SSL 256-bit" },
              { icon: "credit-card" as const, label: "Visa · MC · Amex" },
              { icon: "refresh-cw" as const, label: "Annulable à tout moment" },
              { icon: "zap" as const, label: "Instant" },
            ].map((b, i) => (
              <View key={b.label} style={[styles.trustItem, i < 3 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                <Feather name={b.icon} size={13} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Features ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {isFr ? "Ce qui est inclus" : "What's included"}
          </Text>

          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: isDark ? f.darkBg : f.bg }]}>
                <Feather name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <View style={styles.featureTitleRow}>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
                  {f.tag && (
                    <View style={[styles.featureTag, { backgroundColor: f.tagColor + "18", borderColor: f.tagColor + "30" }]}>
                      <Text style={[styles.featureTagText, { color: f.tagColor }]}>{f.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
              </View>
            </View>
          ))}

          {/* ── Free box ── */}
          <View style={[styles.freeBox, { backgroundColor: colors.card, borderColor: "#10b981" + "30" }]}>
            <View style={[styles.freeIconWrap, { backgroundColor: "#10b981" + "15" }]}>
              <Feather name="check-circle" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.freeTitle, { color: colors.foreground }]}>
                {isFr ? "Toujours gratuit — pour tous" : "Always free — for everyone"}
              </Text>
              <Text style={[styles.freeDesc, { color: colors.mutedForeground }]}>
                {isFr
                  ? "457 services · Chat IA · SOS urgences · Carte interactive · Toutes les catégories"
                  : "457 services · AI Chat · SOS emergency · Interactive map · All categories"}
              </Text>
            </View>
          </View>

          {/* ── FAQ ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {isFr ? "Questions fréquentes" : "FAQ"}
          </Text>

          {[
            {
              q: "Comment annuler mon abonnement ?",
              a: "Vous pouvez annuler à tout moment depuis les paramètres Stripe. Aucun frais supplémentaire.",
            },
            {
              q: "Mes données bancaires sont-elles sécurisées ?",
              a: "Oui — AttenteZéro ne voit jamais votre numéro de carte. Stripe gère le paiement avec une sécurité bancaire (SSL 256-bit, PCI DSS).",
            },
            {
              q: "Le premium est-il disponible pour les organismes ?",
              a: "Un plan communautaire est en développement. Contactez-nous à attentezero5@gmail.com.",
            },
          ].map((item) => (
            <View
              key={item.q}
              style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.faqQ, { color: colors.foreground }]}>{item.q}</Text>
              <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{item.a}</Text>
            </View>
          ))}

          {/* ── Mission note ── */}
          <View style={[styles.missionBox, { backgroundColor: "#7c3aed" + "10", borderColor: "#7c3aed" + "25" }]}>
            <Feather name="heart" size={16} color="#7c3aed" />
            <Text style={[styles.missionText, { color: colors.mutedForeground }]}>
              {isFr
                ? "AttenteZéro est gratuit pour les personnes vulnérables. Le premium est optionnel et finance le maintien et l'amélioration continue de la plateforme."
                : "AttenteZéro is free for vulnerable people. Premium is optional and funds ongoing platform maintenance and improvement."}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* ── Receipt Modal ── */}
      <Modal
        visible={showReceipt}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReceipt(false)}
      >
        <View style={styles.receiptOverlay}>
          <View
            style={[
              styles.receiptSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Success header */}
            <LinearGradient
              colors={["#064e3b", "#065f46", "#0e7e6e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.receiptHeader}
            >
              <View style={styles.receiptOrb} />
              <View style={styles.receiptCheckCircle}>
                <Feather name="check" size={30} color="#fff" />
              </View>
              <Text style={styles.receiptTitle}>Paiement confirmé !</Text>
              <Text style={styles.receiptSubtitle}>
                Bienvenue dans AttenteZéro Premium{"\n"}Votre abonnement est maintenant actif.
              </Text>
            </LinearGradient>

            {receipt && (
              <View style={styles.receiptBody}>
                {/* Amount hero */}
                <View style={[styles.amountHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Montant payé</Text>
                  <Text style={styles.amountValue}>
                    {receipt.amount.toFixed(2).replace(".", ",")} ${" "}
                    <Text style={styles.amountCurrency}>{receipt.currency}</Text>
                  </Text>
                </View>

                {/* Detail rows */}
                <View style={[styles.detailBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {[
                    { label: "Plan", value: `⭐ Premium ${receipt.plan}`, valueColor: "#7c3aed" },
                    {
                      label: "Date",
                      value: new Date(receipt.createdAt * 1000).toLocaleDateString("fr-CA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                      valueColor: null,
                    },
                    { label: "Courriel", value: receipt.customerEmail, valueColor: null },
                    { label: "État", value: "✓ Payé", valueColor: "#10b981" },
                  ].map((row, i, arr) => (
                    <View
                      key={row.label}
                      style={[
                        styles.detailRow,
                        i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: row.valueColor || colors.foreground },
                          row.label === "État" && { fontFamily: "Inter_700Bold" },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.receiptActions}>
                  <Pressable
                    onPress={handleShareReceipt}
                    style={({ pressed }) => [
                      styles.shareBtn,
                      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="share-2" size={16} color={colors.foreground} />
                    <Text style={[styles.shareBtnText, { color: colors.foreground }]}>
                      Partager le reçu
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowReceipt(false)}
                    style={({ pressed }) => [styles.closeReceiptBtn, pressed && { opacity: 0.88 }]}
                  >
                    <LinearGradient
                      colors={["#064e3b", "#0e7e6e"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.closeReceiptGrad}
                    >
                      <Text style={styles.closeReceiptText}>
                        Accéder aux fonctionnalités Premium
                      </Text>
                      <Feather name="arrow-right" size={16} color="#fff" />
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -60,
    right: -60,
  },
  orb2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: -20,
  },
  orb3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(251,191,36,0.06)",
    top: 20,
    left: "40%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(251,191,36,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fbbf24",
    letterSpacing: 0.8,
  },
  headerContent: { gap: 8 },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 34,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
  },

  /* Body */
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },

  /* Plans */
  plansRow: {
    flexDirection: "row",
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }
      : { elevation: 3 }),
  },
  savingsBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  planPrice: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  planPeriod: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  planNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  planCheckWrap: {
    position: "absolute",
    top: 12,
    right: 12,
  },

  /* Subscribe btn */
  subscribeBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 }
      : { elevation: 10 }),
  },
  subscribeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },

  /* Error */
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* Trust row */
  trustRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  trustText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 13,
  },

  /* Features */
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }
      : { elevation: 1 }),
  },
  featureIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, gap: 5 },
  featureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  featureTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  featureTag: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  featureTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  featureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },

  /* Free box */
  freeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  freeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  freeTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  freeDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* FAQ */
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  faqQ: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  faqA: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  /* Mission */
  missionBox: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  missionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* Handle */
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  /* Receipt modal */
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  receiptSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 20 }
      : { elevation: 30 }),
  },
  receiptHeader: {
    padding: 28,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  receiptOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -60,
    right: -50,
  },
  receiptCheckCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  receiptSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
  },

  receiptBody: {
    padding: 20,
    gap: 14,
  },

  /* Amount */
  amountHero: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#0e7e6e",
  },
  amountCurrency: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#0e7e6e",
  },

  /* Detail rows */
  detailBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "right",
  },

  /* Receipt actions */
  receiptActions: { gap: 10 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
  },
  shareBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  closeReceiptBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  closeReceiptGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  closeReceiptText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
