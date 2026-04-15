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
    desc: "Créez votre tableau de bord : services favoris, statut de vos démarches, notes personnelles.",
  },
  {
    icon: "clock" as const,
    color: "#7c3aed",
    bg: "#f5f3ff",
    darkBg: "#2e1a5e",
    title: "Historique complet",
    desc: "Retrouvez tous les services consultés et les conversations avec l'IA, même hors ligne.",
  },
  {
    icon: "bell" as const,
    color: "#d97706",
    bg: "#fffbeb",
    darkBg: "#3b2006",
    title: "Alertes intelligentes",
    desc: "Soyez notifié dès qu'un nouveau service ouvre près de chez vous ou correspond à votre profil.",
  },
  {
    icon: "star" as const,
    color: "#e11d48",
    bg: "#fff1f2",
    darkBg: "#3b0a16",
    title: "Priorisation",
    desc: "L'IA trie les résultats selon votre historique, votre localisation et vos besoins déclarés.",
  },
];

const PLANS = [
  {
    id: "monthly",
    label: "Mensuel",
    price: "5,00 $",
    period: "/mois",
    highlight: false,
  },
  {
    id: "annual",
    label: "Annuel",
    price: "3,75 $",
    period: "/mois",
    note: "45 $/an · Économisez 25 %",
    highlight: true,
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
  const isDark =
    colors.background === "#09090b" || colors.background === "#0a0a0a";

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [loading, setLoading] = useState(false);
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

      if (!res.ok) throw new Error("Impossible de créer la session de paiement.");
      const { url } = await res.json();

      if (Platform.OS === "web") {
        // On web, open directly
        Linking.openURL(url);
      } else {
        // Open Stripe checkout in in-app browser
        const result = await WebBrowser.openBrowserAsync(url, {
          presentationStyle:
            WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
          controlsColor: "#7c3aed",
          toolbarColor: "#1e40af",
        });
        // Browser closed — check subscription status
        if (result.type === "dismiss" || result.type === "cancel") {
          // User closed browser, check if payment was made
          checkSubscriptionStatus();
        }
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Show error
      setReceipt(null);
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
    const dateStr = new Date(receipt.createdAt * 1000).toLocaleDateString(
      "fr-CA",
      { year: "numeric", month: "long", day: "numeric" }
    );
    const text = `Reçu AttenteZéro Premium\n\nMontant : ${receipt.amount} $ ${receipt.currency}\nPlan : ${receipt.plan}\nDate : ${dateStr}\nCourriel : ${receipt.customerEmail}\nStatut : Payé ✓\n\nMerci de votre confiance — AttenteZéro`;
    await Share.share({ message: text, title: "Reçu AttenteZéro Premium" });
  }

  return (
    <>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={["#1e1b4b", "#3730a3", "#7c3aed"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            {
              paddingTop:
                (Platform.OS === "web" ? 16 : insets.top) + 8,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <View style={styles.headerBadge}>
              <Feather name="star" size={13} color="#fbbf24" />
              <Text style={styles.headerBadgeText}>PREMIUM</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {isFr ? "Passez à la version avancée" : "Upgrade to advanced"}
            </Text>
            <Text style={styles.headerSub}>
              {isFr
                ? "Paiement sécurisé par Stripe · Annulable à tout moment"
                : "Secured by Stripe · Cancel anytime"}
            </Text>
          </View>
          <View style={styles.orb1} />
          <View style={styles.orb2} />
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* ── Plan selector ── */}
          <View style={styles.plansRow}>
            {PLANS.map((plan) => (
              <Pressable
                key={plan.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedPlan(plan.id as "monthly" | "annual");
                }}
                style={[
                  styles.planCard,
                  {
                    backgroundColor:
                      selectedPlan === plan.id ? "#7c3aed" : colors.card,
                    borderColor:
                      selectedPlan === plan.id ? "#7c3aed" : colors.border,
                  },
                ]}
              >
                {plan.highlight && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MEILLEUR PRIX</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.planLabel,
                    {
                      color:
                        selectedPlan === plan.id
                          ? "rgba(255,255,255,0.75)"
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {plan.label}
                </Text>
                <View style={styles.planPriceRow}>
                  <Text
                    style={[
                      styles.planPrice,
                      {
                        color:
                          selectedPlan === plan.id ? "#fff" : colors.foreground,
                      },
                    ]}
                  >
                    {plan.price}
                  </Text>
                  <Text
                    style={[
                      styles.planPeriod,
                      {
                        color:
                          selectedPlan === plan.id
                            ? "rgba(255,255,255,0.65)"
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {plan.period}
                  </Text>
                </View>
                {plan.note && (
                  <Text
                    style={[
                      styles.planNote,
                      {
                        color:
                          selectedPlan === plan.id
                            ? "rgba(255,255,255,0.8)"
                            : "#7c3aed",
                      },
                    ]}
                  >
                    {plan.note}
                  </Text>
                )}
                {selectedPlan === plan.id && (
                  <View style={styles.planCheck}>
                    <Feather name="check-circle" size={16} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* ── Subscribe button ── */}
          <Pressable
            onPress={handleSubscribe}
            disabled={loading}
            style={({ pressed }) => [
              styles.subscribeBtn,
              pressed && { opacity: 0.88 },
            ]}
          >
            <LinearGradient
              colors={["#6d28d9", "#7c3aed", "#a21caf"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribeBtnGrad}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="lock" size={17} color="#fff" />
                  <Text style={styles.subscribeBtnText}>
                    {isFr
                      ? "Payer maintenant avec Stripe"
                      : "Pay now with Stripe"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Trust badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustBadge}>
              <Feather name="shield" size={12} color={colors.mutedForeground} />
              <Text style={[styles.trustText, { color: colors.mutedForeground }]}>
                Paiement sécurisé SSL
              </Text>
            </View>
            <View style={styles.trustBadge}>
              <Feather name="credit-card" size={12} color={colors.mutedForeground} />
              <Text style={[styles.trustText, { color: colors.mutedForeground }]}>
                Visa · MC · Amex
              </Text>
            </View>
            <View style={styles.trustBadge}>
              <Feather name="x-circle" size={12} color={colors.mutedForeground} />
              <Text style={[styles.trustText, { color: colors.mutedForeground }]}>
                Annulable anytime
              </Text>
            </View>
          </View>

          {/* ── Features ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {isFr ? "Ce qui est inclus" : "What's included"}
          </Text>

          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                styles.featureCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.featureIconWrap,
                  { backgroundColor: isDark ? f.darkBg : f.bg },
                ]}
              >
                <Feather name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                  {f.title}
                </Text>
                <Text
                  style={[styles.featureDesc, { color: colors.mutedForeground }]}
                >
                  {f.desc}
                </Text>
              </View>
            </View>
          ))}

          {/* ── Free box ── */}
          <View
            style={[
              styles.freeBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.freeHeader}>
              <Feather name="check-circle" size={16} color="#10b981" />
              <Text style={[styles.freeTitle, { color: colors.foreground }]}>
                {isFr ? "Toujours gratuit" : "Always free"}
              </Text>
            </View>
            <Text style={[styles.freeDesc, { color: colors.mutedForeground }]}>
              {isFr
                ? "457 services · Chat IA · SOS urgences · Carte interactive · Toutes les catégories"
                : "457 services · AI Chat · SOS emergency · Interactive map · All categories"}
            </Text>
          </View>

          {/* ── Mission note ── */}
          <View
            style={[
              styles.missionBox,
              {
                backgroundColor: "#7c3aed" + "10",
                borderColor: "#7c3aed" + "25",
              },
            ]}
          >
            <Feather name="heart" size={15} color="#7c3aed" />
            <Text style={[styles.missionText, { color: colors.mutedForeground }]}>
              {isFr
                ? "AttenteZéro est gratuit pour les personnes vulnérables. Le premium est optionnel et finance le maintien et l'amélioration de la plateforme."
                : "AttenteZéro is free for vulnerable people. Premium is optional and funds platform maintenance and improvement."}
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
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <LinearGradient
              colors={["#064e3b", "#0e7e6e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.receiptHeader}
            >
              <View style={styles.receiptCheckCircle}>
                <Feather name="check" size={28} color="#fff" />
              </View>
              <Text style={styles.receiptTitle}>Paiement confirmé !</Text>
              <Text style={styles.receiptSubtitle}>
                Bienvenue dans AttenteZéro Premium
              </Text>
              <View style={styles.receiptOrb} />
            </LinearGradient>

            {receipt && (
              <View style={styles.receiptBody}>
                {/* Amount */}
                <View
                  style={[
                    styles.receiptAmountBox,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.receiptAmountLabel, { color: colors.mutedForeground }]}
                  >
                    Montant payé
                  </Text>
                  <Text style={styles.receiptAmountValue}>
                    {receipt.amount.toFixed(2).replace(".", ",")} ${" "}
                    <Text style={styles.receiptAmountCurrency}>
                      {receipt.currency}
                    </Text>
                  </Text>
                </View>

                {/* Details */}
                {[
                  {
                    label: "Plan",
                    value: `⭐ Premium ${receipt.plan}`,
                    color: "#7c3aed",
                  },
                  {
                    label: "Date",
                    value: new Date(
                      receipt.createdAt * 1000
                    ).toLocaleDateString("fr-CA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  },
                  { label: "Courriel", value: receipt.customerEmail },
                  { label: "État", value: "✓ Payé", color: "#10b981" },
                ].map((row) => (
                  <View
                    key={row.label}
                    style={[
                      styles.receiptRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.receiptRowLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        styles.receiptRowValue,
                        {
                          color: row.color || colors.foreground,
                          fontFamily:
                            row.label === "État"
                              ? "Inter_700Bold"
                              : "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}

                <Text
                  style={[
                    styles.receiptThanks,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Merci de votre confiance. Votre abonnement est maintenant actif.
                </Text>

                {/* Actions */}
                <View style={styles.receiptActions}>
                  <Pressable
                    onPress={handleShareReceipt}
                    style={({ pressed }) => [
                      styles.shareBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Feather name="share-2" size={16} color={colors.foreground} />
                    <Text
                      style={[styles.shareBtnText, { color: colors.foreground }]}
                    >
                      Partager / Télécharger
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowReceipt(false)}
                    style={({ pressed }) => [
                      styles.closeReceiptBtn,
                      pressed && { opacity: 0.88 },
                    ]}
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
    paddingBottom: 28,
    gap: 16,
    overflow: "hidden",
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
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(251,191,36,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fbbf24",
    letterSpacing: 0.8,
  },
  headerContent: { gap: 6 },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  orb1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -50,
    right: -40,
  },
  orb2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -20,
    left: 30,
  },

  body: {
    padding: 16,
    gap: 14,
  },

  /* Plans */
  plansRow: { flexDirection: "row", gap: 12 },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 4,
    overflow: "hidden",
    position: "relative",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#7c3aed",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        }
      : { elevation: 3 }),
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    right: 8,
    backgroundColor: "#fbbf24",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  popularBadgeText: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    color: "#1e1b4b",
    letterSpacing: 0.3,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 4,
  },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planNote: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  planCheck: { position: "absolute", bottom: 12, right: 12 },

  /* Subscribe btn */
  subscribeBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#7c3aed",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
        }
      : { elevation: 8 }),
  },
  subscribeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    minHeight: 56,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  /* Trust badges */
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
    marginTop: -4,
  },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 10, fontFamily: "Inter_400Regular" },

  /* Section title */
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },

  /* Feature cards */
  featureCard: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "flex-start",
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* Free box */
  freeBox: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  freeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  freeDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* Mission */
  missionBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
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

  /* Receipt Modal */
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  receiptSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
        }
      : { elevation: 24 }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  receiptHeader: {
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  receiptCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
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
  },
  receiptOrb: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -30,
  },
  receiptBody: { padding: 20, gap: 14 },
  receiptAmountBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  receiptAmountLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  receiptAmountValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#0e7e6e",
  },
  receiptAmountCurrency: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#7c3aed",
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  receiptRowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  receiptRowValue: { fontSize: 13 },
  receiptThanks: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  receiptActions: { gap: 10, marginTop: 4 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  shareBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  closeReceiptBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  closeReceiptGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  closeReceiptText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
