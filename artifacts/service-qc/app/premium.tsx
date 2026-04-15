import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

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
  { id: "monthly", label: "Mensuel", price: "5,00 $", period: "/mois", highlight: false },
  { id: "annual",  label: "Annuel",  price: "3,75 $", period: "/mois", note: "45 $/an · Économisez 35 %", highlight: true },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";
  const isDark = colors.background === "#09090b" || colors.background === "#0a0a0a";

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");

  function handleSubscribe() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "🚀 Bientôt disponible",
      "Le paiement en ligne sera intégré prochainement. Merci de votre intérêt pour AttenteZéro Premium !",
      [{ text: "OK", style: "default" }]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={["#1e1b4b", "#3730a3", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
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
              ? "Débloquez des outils puissants pour mieux naviguer dans les services communautaires"
              : "Unlock powerful tools to better navigate community services"}
          </Text>
        </View>

        {/* Decorative orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
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
                  backgroundColor: selectedPlan === plan.id ? "#7c3aed" : colors.card,
                  borderColor: selectedPlan === plan.id ? "#7c3aed" : colors.border,
                },
              ]}
            >
              {plan.highlight && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAIRE</Text>
                </View>
              )}
              <Text style={[styles.planLabel, { color: selectedPlan === plan.id ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                {plan.label}
              </Text>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: selectedPlan === plan.id ? "#fff" : colors.foreground }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planPeriod, { color: selectedPlan === plan.id ? "rgba(255,255,255,0.65)" : colors.mutedForeground }]}>
                  {plan.period}
                </Text>
              </View>
              {plan.note && (
                <Text style={[styles.planNote, { color: selectedPlan === plan.id ? "rgba(255,255,255,0.8)" : "#7c3aed" }]}>
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
          style={({ pressed }) => [styles.subscribeBtn, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={["#6d28d9", "#7c3aed", "#a21caf"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeBtnGrad}
          >
            <Feather name="star" size={18} color="#fbbf24" />
            <Text style={styles.subscribeBtnText}>
              {isFr ? "S'abonner maintenant" : "Subscribe now"}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={[styles.cancelNote, { color: colors.mutedForeground }]}>
          {isFr ? "Annulable à tout moment · Aucun engagement" : "Cancel anytime · No commitment"}
        </Text>

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
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* ── Gratuit section ── */}
        <View style={[styles.freeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        <View style={[styles.missionBox, { backgroundColor: "#7c3aed" + "10", borderColor: "#7c3aed" + "25" }]}>
          <Feather name="heart" size={15} color="#7c3aed" />
          <Text style={[styles.missionText, { color: colors.mutedForeground }]}>
            {isFr
              ? "AttenteZéro est gratuit pour les personnes vulnérables. Le premium est optionnel et finance le maintien et l'amélioration de la plateforme."
              : "AttenteZéro is free for vulnerable people. Premium is optional and funds platform maintenance and improvement."}
          </Text>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 19,
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
  plansRow: {
    flexDirection: "row",
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 4,
    overflow: "hidden",
    position: "relative",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }
      : { elevation: 3 }),
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fbbf24",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#1e1b4b",
    letterSpacing: 0.5,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 4 },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  planCheck: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },

  /* Subscribe btn */
  subscribeBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 }
      : { elevation: 8 }),
  },
  subscribeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  cancelNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -4,
  },

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
  featureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  /* Free box */
  freeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  freeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  freeDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

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
});
