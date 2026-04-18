import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/apiBase";

const CONTACT_EMAIL = "attentezero5@gmail.com";

type TierId = "users" | "orgs";

type Tier = {
  id: TierId;
  emoji: string;
  color: string;
  gradColors: readonly [string, string];
  audience: string;
  tagline: string;
  priceLabel: string;
  priceUnit: string | null;
  trialBadge?: string;
  perks: string[];
  ctaLabel: string;
  ctaKind: "premium" | "trial" | "contact";
};

const TIERS: Tier[] = [
  {
    id: "users",
    emoji: "🟢",
    color: "#10b981",
    gradColors: ["#065f46", "#10b981"],
    audience: "Utilisateurs",
    tagline: "Trouvez de l'aide gratuitement",
    priceLabel: "Gratuit",
    priceUnit: null,
    perks: [
      "Rechercher parmi tous les services",
      "Appeler directement les organismes",
      "SOS urgences avec tri par proximité",
      "Répertoire des services par ville",
    ],
    ctaLabel: "Continuer gratuitement",
    ctaKind: "premium",
  },
  {
    id: "users",
    emoji: "⭐",
    color: "#7c3aed",
    gradColors: ["#4c1d95", "#7c3aed"],
    audience: "Utilisateur Premium",
    tagline: "Débloquez le chat IA et les favoris à vie",
    priceLabel: "10 $",
    priceUnit: "une seule fois",
    perks: [
      "Tout du forfait gratuit",
      "Chat IA multilingue illimité (FR · EN · ES · AR · HT)",
      "Sauvegarder vos services favoris",
      "Alertes critiques personnalisées",
      "Aucun abonnement — payez une fois, gardez à vie",
    ],
    ctaLabel: "Devenir Premium — 10 $",
    ctaKind: "premium",
  },
  {
    id: "orgs",
    emoji: "🏢",
    color: "#0e7e6e",
    gradColors: ["#064e3b", "#0e7e6e"],
    audience: "Organismes & Partenaires",
    tagline: "Soyez visible auprès des personnes qui ont besoin de vous",
    priceLabel: "39 $",
    priceUnit: "/ mois",
    trialBadge: "14 jours d'essai gratuit",
    perks: [
      "Profil organisme complet (logo, photos, horaires)",
      "Badge « Vérifié » pour rassurer les utilisateurs",
      "Mise en avant dans les résultats",
      "Statistiques de vues et appels reçus",
      "Aucune carte de crédit requise pour l'essai",
      "Annulable à tout moment",
    ],
    ctaLabel: "Démarrer l'essai gratuit 14 jours",
    ctaKind: "trial",
  },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleUserPremium() {
    if (!isAuthenticated) {
      Alert.alert(
        "Connexion requise",
        "Connectez-vous d'abord pour acheter le forfait Premium.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Se connecter", onPress: () => router.push("/login" as any) },
        ]
      );
      return;
    }
    try {
      setLoadingTier("user-premium");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${getApiBaseUrl()}/api/stripe/create-user-premium-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Erreur de paiement");
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      Alert.alert("Paiement impossible", msg);
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleOrgTrial() {
    if (!isAuthenticated) {
      Alert.alert(
        "Compte requis",
        "Créez un compte organisme pour démarrer votre essai gratuit de 14 jours.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Créer un compte", onPress: () => router.push("/register" as any) },
        ]
      );
      return;
    }
    try {
      setLoadingTier("org-trial");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${getApiBaseUrl()}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          userId: user?.id,
          plan: "standard",
          interval: "monthly",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Erreur de paiement");
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      Alert.alert("Inscription impossible", msg);
    } finally {
      setLoadingTier(null);
    }
  }

  function handleTierCta(tier: Tier, idx: number) {
    if (tier.ctaKind === "trial") return handleOrgTrial();
    if (tier.ctaKind === "premium" && idx === 1) return handleUserPremium();
    // First "free" tier — just go back / show toast
    Haptics.selectionAsync();
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={["#064e3b", "#065f46", "#0f766e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 8 }]}
      >
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.orb1} />
          <View style={styles.orb2} />
        </View>

        <View style={styles.headerRow}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <View style={styles.chip}>
            <Feather name="zap" size={10} color="#34d399" />
            <Text style={styles.chipText}>TARIFICATION</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Nos forfaits</Text>

        <Text style={styles.headerSub} numberOfLines={3}>
          Toujours gratuit pour trouver de l'aide. Premium et organismes financent la plateforme.
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {TIERS.map((tier, idx) => {
          const isLoading =
            (tier.ctaKind === "trial" && loadingTier === "org-trial") ||
            (tier.ctaKind === "premium" && idx === 1 && loadingTier === "user-premium");
          return (
            <View
              key={`${tier.id}-${idx}`}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: tier.color + "40",
                },
              ]}
            >
              <LinearGradient
                colors={tier.gradColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardHeader}
              >
                <View style={styles.cardHeaderTop}>
                  <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                  <View style={styles.tierTextWrap}>
                    <Text style={styles.tierName} numberOfLines={1} adjustsFontSizeToFit>
                      {tier.audience}
                    </Text>
                    <Text style={styles.tierTagline} numberOfLines={2}>
                      {tier.tagline}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
                    {tier.priceLabel}
                  </Text>
                  {tier.priceUnit && (
                    <Text style={styles.priceUnit} numberOfLines={1}>{tier.priceUnit}</Text>
                  )}
                </View>

                {tier.trialBadge && (
                  <View style={styles.trialBadge}>
                    <Feather name="gift" size={12} color="#fff" />
                    <Text style={styles.trialBadgeText}>{tier.trialBadge}</Text>
                  </View>
                )}
              </LinearGradient>

              <View style={styles.cardBody}>
                {tier.perks.map((perk, pidx) => (
                  <View key={pidx} style={styles.perkRow}>
                    <View style={[styles.perkCheck, { backgroundColor: tier.color + "20" }]}>
                      <Feather name="check" size={11} color={tier.color} />
                    </View>
                    <Text style={[styles.perkText, { color: colors.foreground }]}>
                      {perk}
                    </Text>
                  </View>
                ))}

                <Pressable
                  onPress={() => handleTierCta(tier, idx)}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    { backgroundColor: tier.color, opacity: pressed || isLoading ? 0.85 : 1 },
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather
                        name={tier.ctaKind === "trial" ? "gift" : tier.ctaKind === "premium" && idx === 1 ? "star" : "check"}
                        size={15}
                        color="#fff"
                      />
                      <Text style={styles.ctaBtnText} numberOfLines={1} adjustsFontSizeToFit>
                        {tier.ctaLabel}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* ─── Contact CTA ─── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Question%20%E2%80%94%20AttenteZ%C3%A9ro`);
          }}
          style={({ pressed }) => [
            styles.contactCard,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#064e3b", "#0e7e6e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.contactIcon}
          >
            <Feather name="mail" size={18} color="#fff" />
          </LinearGradient>
          <View style={styles.contactText}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]} numberOfLines={1}>
              Une question ?
            </Text>
            <Text style={[styles.contactSub, { color: "#0e7e6e" }]} numberOfLines={1}>
              {CONTACT_EMAIL}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>

        {/* ─── Mission note ─── */}
        <View style={[styles.missionCard, { backgroundColor: "#0e7e6e10", borderColor: "#0e7e6e30" }]}>
          <Feather name="heart" size={15} color="#0e7e6e" style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={[styles.missionText, { color: colors.mutedForeground }]}>
            L'accès à l'aide reste toujours gratuit. Premium et abonnements organismes financent l'app pour la garder vivante.
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
    paddingHorizontal: 18,
    paddingBottom: 22,
    overflow: "hidden",
    gap: 12,
  },
  orb1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -80,
    right: -60,
  },
  orb2: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -40,
    left: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 19,
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },

  /* Card */
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  cardHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  tierEmoji: {
    fontSize: 28,
    flexShrink: 0,
  },
  tierTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  tierName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  tierTagline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
  },
  priceText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  trialBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.2,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 10,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minWidth: 0,
  },
  perkCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  perkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 8,
    minHeight: 46,
  },
  ctaBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    flexShrink: 1,
  },

  /* Contact card */
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contactText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contactTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contactSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  /* Mission card */
  missionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
  },
  missionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
