import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PremiumGateModal from "@/components/PremiumGateModal";
import { BrandFooter } from "@/components/BrandFooter";
import { useColors } from "@/hooks/useColors";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { usePlanGate } from "@/hooks/usePlanGate";
import { isUnlimited } from "@/lib/planLimits";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServicesData } from "@/contexts/ServicesContext";
import { getApiBaseUrl } from "@/lib/apiBase";
import { useAuth } from "@/lib/auth";

const PREMIUM_FEATURES = [
  {
    icon: "bar-chart-2" as const,
    color: "#0e7e6e",
    bg: "#f0fdf4",
    darkBg: "#052e1c",
    label: "Suivi personnalisé",
    desc: "Suivez l'évolution de vos démarches en temps réel",
  },
  {
    icon: "clock" as const,
    color: "#7c3aed",
    bg: "#f5f3ff",
    darkBg: "#2e1a5e",
    label: "Historique complet",
    desc: "Retrouvez vos recherches et services consultés",
  },
  {
    icon: "bell" as const,
    color: "#d97706",
    bg: "#fffbeb",
    darkBg: "#3b2006",
    label: "Alertes intelligentes",
    desc: "Notifié dès qu'un service proche est disponible",
  },
  {
    icon: "star" as const,
    color: "#e11d48",
    bg: "#fff1f2",
    darkBg: "#3b0a16",
    label: "Priorisation",
    desc: "Services les plus pertinents en premier",
  },
];

const OTHER_OPTIONS = [
  {
    icon: "heart" as const,
    color: "#e11d48",
    bg: "#fff1f2",
    darkBg: "#3b0a16",
    title: "Faire un don",
    desc: "Soutenir AttenteZéro et financer de nouveaux services",
    badge: "Bientôt",
    badgeColor: "#e11d48",
  },
  {
    icon: "briefcase" as const,
    color: "#7c3aed",
    bg: "#f5f3ff",
    darkBg: "#2e1a5e",
    title: "Partenariat organisation",
    desc: "Vous êtes un organisme communautaire ? Référencez vos services gratuitement",
    badge: "Bientôt",
    badgeColor: "#7c3aed",
  },
  {
    icon: "users" as const,
    color: "#0284c7",
    bg: "#f0f9ff",
    darkBg: "#0c2a3b",
    title: "Programme ambassadeur",
    desc: "Parrainez des proches et gagnez des mois premium offerts",
    badge: "Bientôt",
    badgeColor: "#0284c7",
  },
  {
    icon: "tag" as const,
    color: "#059669",
    bg: "#f0fdf4",
    darkBg: "#052e1c",
    title: "Publicité locale responsable",
    desc: "Pour organismes et institutions seulement — zéro pub intrusive",
    badge: "Bientôt",
    badgeColor: "#059669",
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const { user, getToken } = useAuth();
  const isFr = language !== "en";
  const isDark = colors.background === "#09090b" || colors.background === "#0a0a0a";

  const { services } = useServicesData();
  const servicesCount = Math.max(1, Math.floor(services.length / 10) * 10);

  const { remaining, showGate, recordAttempt, checkAndRemind, dismissGate, isGated } = usePremiumGate();

  // Each time user returns to this tab while gated → re-show the reminder modal
  useFocusEffect(
    useCallback(() => {
      checkAndRemind();
    }, [checkAndRemind])
  );

  async function handleFeaturePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recordAttempt();
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={["#0e7e6e", "#0a5e52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 16 }]}
        >
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {isFr ? "Plus" : "More"}
          </Text>
          <Text style={styles.headerSub}>
            {isFr ? "Fonctionnalités et options" : "Features & options"}
          </Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Mode Terrain (clients/agenda/équipe/fil d'activité) retiré v1.0.33 —
              AttenteZéro ne stocke plus de données sensibles de bénéficiaires. */}

          {/* ── Persistent reminder banner (shown after 3 uses) ── */}
          {isGated && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                checkAndRemind();
              }}
              style={({ pressed }) => [styles.reminderBanner, { opacity: pressed ? 0.9 : 1 }]}
            >
              <LinearGradient
                colors={["#92400e", "#b45309"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reminderGrad}
              >
                <View style={styles.reminderIcon}>
                  <Feather name="bell" size={16} color="#fbbf24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderTitle}>Rappel — Forfait avancé</Text>
                  <Text style={styles.reminderSub}>
                    Vous avez atteint la limite d'essais gratuits. Passez Premium pour 10 $ une seule fois.
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>
          )}

          {/* ── Premium card ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/premium" as any);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
          >
            <LinearGradient
              colors={["#1e40af", "#7c3aed", "#a21caf"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumCard}
            >
              <View style={styles.premiumTop}>
                <View style={styles.premiumBadge}>
                  <Feather name="star" size={13} color="#fbbf24" />
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
                <View style={styles.premiumPrice}>
                  <Text style={styles.premiumAmount}>10 $</Text>
                  <Text style={styles.premiumPeriod}>{isFr ? "à vie" : "lifetime"}</Text>
                </View>
              </View>

              <Text style={styles.premiumTitle}>
                {isFr ? "Soutenez AttenteZéro" : "Support AttenteZéro"}
              </Text>
              <Text style={styles.premiumSub}>
                {isFr
                  ? "Gratuit pour tous · Premium 10 $/mois pour fonctions avancées et soutien du projet."
                  : "Free for everyone · Premium $10/month for advanced features and to support the project."}
              </Text>

              <View style={styles.premiumFeaturesList}>
                {PREMIUM_FEATURES.map((f) => (
                  <View key={f.label} style={styles.premiumFeatureRow}>
                    <View style={styles.premiumCheckCircle}>
                      <Feather name="check" size={11} color="#fff" />
                    </View>
                    <Text style={styles.premiumFeatureText}>{f.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.premiumCta}>
                <Text style={styles.premiumCtaText}>
                  {isFr ? "Voir les détails" : "See details"}
                </Text>
                <Feather name="arrow-right" size={15} color="#fff" />
              </View>

              <View style={styles.premiumOrb1} />
              <View style={styles.premiumOrb2} />
            </LinearGradient>
          </Pressable>

          {/* ── Invite a friend / family member ── */}
          <Pressable
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const url = "https://attentezero.replit.app";
              const message = isFr
                ? `J'utilise AttenteZéro pour trouver des services communautaires au Québec — c'est gratuit et ça peut aider quelqu'un autour de toi.\n\n${url}`
                : `I'm using AttenteZéro to find community services in Quebec — it's free and could help someone around you.\n\n${url}`;
              try {
                await Share.share(
                  Platform.OS === "ios"
                    ? { message, url }
                    : { message, title: "AttenteZéro" },
                );
              } catch {
                // user cancelled or share unavailable
              }
            }}
            style={({ pressed }) => [
              styles.inviteCard,
              {
                backgroundColor: isDark ? "#052e1c" : "#ecfdf5",
                borderColor: isDark ? "#065f46" : "#a7f3d0",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.inviteIcon, { backgroundColor: isDark ? "#0a6558" : "#10b981" }]}>
              <Feather name="user-plus" size={20} color="#ffffff" />
            </View>
            <View style={styles.inviteText}>
              <Text style={[styles.inviteTitle, { color: colors.foreground }]} numberOfLines={1}>
                {isFr ? "Inviter un proche" : "Invite someone"}
              </Text>
              <Text style={[styles.inviteDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {isFr
                  ? "Partagez l'application avec une personne qui pourrait en avoir besoin."
                  : "Share the app with someone who might need it."}
              </Text>
            </View>
            <Feather name="share-2" size={18} color={isDark ? "#34d399" : "#0e7e6e"} />
          </Pressable>

          {/* ── Free vs Premium quick compare ── */}
          <View style={[styles.compareBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.compareCol}>
              <Text style={[styles.compareColTitle, { color: colors.mutedForeground }]}>Gratuit</Text>
              {[`${servicesCount}+ services`, "Chat IA", "SOS urgences", "Géolocalisation"].map((f) => (
                <View key={f} style={styles.compareRow}>
                  <Feather name="check" size={13} color="#10b981" />
                  <Text style={[styles.compareText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <View style={styles.compareCol}>
              <Text style={[styles.compareColTitle, { color: "#7c3aed" }]}>⭐ Premium</Text>
              {["Tout le gratuit", "Suivi perso.", "Historique", "Alertes", "Priorisation"].map((f) => (
                <View key={f} style={styles.compareRow}>
                  <Feather name="check" size={13} color="#7c3aed" />
                  <Text style={[styles.compareText, { color: colors.foreground }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Premium features — clickable with gate ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {isFr ? "Fonctionnalités avancées" : "Advanced features"}
            </Text>
            {!isGated && (
              <View style={[styles.trialBadge, { backgroundColor: "#7c3aed" + "18", borderColor: "#7c3aed" + "30" }]}>
                <Feather name="gift" size={11} color="#7c3aed" />
                <Text style={[styles.trialBadgeText, { color: "#7c3aed" }]}>
                  {remaining} essai{remaining !== 1 ? "s" : ""} gratuit{remaining !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>

          {PREMIUM_FEATURES.map((f) => (
            <Pressable
              key={f.label}
              onPress={handleFeaturePress}
              style={({ pressed }) => [
                styles.featureCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: isDark ? f.darkBg : f.bg }]}>
                <Feather name={f.icon} size={20} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.label}</Text>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
              </View>
              <View style={[styles.lockBadge, { backgroundColor: isGated ? "#7c3aed" : "#10b981" + "18" }]}>
                <Feather
                  name={isGated ? "lock" : "zap"}
                  size={13}
                  color={isGated ? "#fff" : "#10b981"}
                />
              </View>
            </Pressable>
          ))}

          {/* ── Section title: Autres options ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4 }]}>
            {isFr ? "Autres options de financement" : "Other funding options"}
          </Text>

          {/* ── Option cards ── */}
          {OTHER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.title}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => Haptics.selectionAsync()}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: isDark ? opt.darkBg : opt.bg }]}>
                <Feather name={opt.icon} size={20} color={opt.color} />
              </View>
              <View style={styles.optionText}>
                <View style={styles.optionTitleRow}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>{opt.title}</Text>
                  <View style={[styles.optionBadge, { backgroundColor: opt.badgeColor + "18", borderColor: opt.badgeColor + "30" }]}>
                    <Text style={[styles.optionBadgeText, { color: opt.badgeColor }]}>{opt.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}

          {/* ── Section title: Mon compte ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4 }]}>
            {isFr ? "Mon compte" : "My account"}
          </Text>

          {/* ── Mon abonnement card (Stripe billing portal) ── */}
          {user?.email && (
            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                try {
                  const tk = await getToken().catch(() => null);
                  const res = await fetch(`${getApiBaseUrl()}/api/stripe/user-portal`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                    },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.url) {
                    Alert.alert(
                      isFr ? "Aucun abonnement" : "No subscription",
                      data.error ?? (isFr
                        ? "Aucun abonnement Stripe trouvé pour votre compte."
                        : "No Stripe subscription found for your account."),
                    );
                    return;
                  }
                  await WebBrowser.openBrowserAsync(data.url);
                } catch (err) {
                  Alert.alert(
                    isFr ? "Erreur" : "Error",
                    err instanceof Error ? err.message : "Network error",
                  );
                }
              }}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: isDark ? "#1e1b4b" : "#eef2ff" }]}>
                <Feather name="credit-card" size={20} color="#6366f1" />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {isFr ? "Mon abonnement" : "My subscription"}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {isFr
                    ? "Gérer le paiement, changer de forfait, annuler"
                    : "Manage payment, change plan, cancel"}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          {/* ── Profil card ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/profile" as any);
            }}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: isDark ? "#052e1c" : "#f0fdf4" }]}>
              <Feather name="user" size={20} color="#0e7e6e" />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
                {user
                  ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || (isFr ? "Mon profil" : "My profile")
                  : isFr ? "Profil" : "Profile"}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user
                  ? user.email ?? (isFr ? "Voir mon profil" : "View profile")
                  : isFr ? "Connexion · paramètres · déconnexion" : "Login · settings · sign out"}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          {/* ── Section title: Aide ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 4 }]}>
            {isFr ? "Aide & support" : "Help & support"}
          </Text>

          {/* ── Signaler un bogue card ── */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/bug-report" as any);
            }}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: isDark ? "#3b1a06" : "#fff7ed" }]}>
              <Feather name="alert-triangle" size={20} color="#ea580c" />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]} numberOfLines={1}>
                {isFr ? "Signaler un bogue" : "Report a bug"}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {isFr
                  ? "Un problème dans l'application ? Parlez-nous-en."
                  : "Spotted an issue in the app? Let us know."}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          {/* ── Philosophy note ── */}
          <View style={[styles.noteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={15} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {isFr
                ? "AttenteZéro restera toujours gratuit pour les personnes vulnérables. Le premium est optionnel et finance le maintien de la plateforme."
                : "AttenteZéro will always be free for vulnerable people. Premium is optional and funds the platform's upkeep."}
            </Text>
          </View>

          <BrandFooter />

        </View>
      </ScrollView>

      {/* ── Gate modal ── */}
      <PremiumGateModal
        visible={showGate}
        onDismiss={dismissGate}
        userEmail={user?.email}
        remaining={0}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },

  /* Premium card */
  premiumCard: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    gap: 10,
  },
  premiumOrb1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -30,
  },
  premiumOrb2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: 20,
  },
  premiumTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(251,191,36,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },
  premiumBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fbbf24",
    letterSpacing: 0.5,
  },
  premiumPrice: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  premiumAmount: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  premiumPeriod: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  premiumTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  premiumSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  premiumFeaturesList: {
    gap: 7,
    marginTop: 4,
  },
  premiumFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  premiumCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  premiumCtaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  /* Compare box */
  compareBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  compareCol: { flex: 1, gap: 8 },
  compareColTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  compareText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  compareDivider: { width: 1, alignSelf: "stretch" },

  /* Invite card */
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteText: { flex: 1, gap: 2 },
  inviteTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  inviteDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },

  /* Reminder banner */
  reminderBanner: {
    borderRadius: 14,
    overflow: "hidden",
  },
  reminderGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(251,191,36,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reminderTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  reminderSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 16,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  trialBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  /* Feature cards */
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  lockBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Option cards */
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  optionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionText: { flex: 1, gap: 3 },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  optionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  /* Mode Terrain card */
  terrainCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  terrainIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  terrainBadgeRow: { flexDirection: "row", marginBottom: 4 },
  terrainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(186,230,253,0.18)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(186,230,253,0.3)",
  },
  terrainBadgeText: {
    color: "#bae6fd",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  terrainTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  terrainSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginTop: 2,
  },

  /* Note */
  noteBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    marginTop: 4,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
