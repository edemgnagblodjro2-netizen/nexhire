import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

const CONTACT_EMAIL = "contact@attentezero.ca";

type TierId = "users";

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
  ctaKind: "premium" | "free" | "contact";
  contactEmail?: string;
  contactSubject?: string;
};

// Pivot v1.0.33 — pricing simplifié à deux paliers grand public.
// Les forfaits Travailleur (19$), Organisme (39$), Plus (89$) et Institution
// (199$) ont été retirés en même temps que Mode Terrain. La monétisation B2B
// passe désormais par des contrats institutionnels directs (B2G) traités hors
// app — voir replit.md pour la stratégie commerciale.
const TIERS: Tier[] = [
  {
    id: "users",
    emoji: "🟢",
    color: "#10b981",
    gradColors: ["#065f46", "#10b981"],
    audience: "Citoyen — Gratuit",
    tagline: "Trouvez de l'aide, gratuitement, sans compte requis",
    priceLabel: "Gratuit",
    priceUnit: null,
    perks: [
      "Rechercher parmi tous les services",
      "Appeler directement les organismes",
      "SOS urgences avec tri par proximité",
      "Répertoire des services par ville",
      "Chat IA — 5 messages par jour",
    ],
    ctaLabel: "Continuer gratuitement",
    ctaKind: "free",
  },
  {
    id: "users",
    emoji: "⭐",
    color: "#7c3aed",
    gradColors: ["#4c1d95", "#7c3aed"],
    audience: "Premium — Soutien",
    tagline: "Débloquez le chat IA illimité et les favoris à vie",
    priceLabel: "10 $",
    priceUnit: "une seule fois",
    perks: [
      "Tout du forfait gratuit",
      "Chat IA multilingue illimité (FR · EN · ES · AR · HT)",
      "Sauvegarder vos services favoris",
      "Alertes critiques personnalisées",
      "Aucun abonnement — payez une fois, gardez à vie",
      "Vous soutenez un projet 100 % québécois",
    ],
    ctaLabel: "Devenir Premium — 10 $",
    ctaKind: "premium",
  },
  {
    id: "users",
    emoji: "🏢",
    color: "#0e7e6e",
    gradColors: ["#064e3b", "#0e7e6e"],
    audience: "Organisme — À vie",
    tagline: "Pour les organismes communautaires et OBNL",
    priceLabel: "149,99 $",
    priceUnit: "à vie",
    perks: [
      "Accès complet à vie pour votre organisme",
      "Visibilité accrue dans le répertoire",
      "Support dédié par courriel",
      "Aucun abonnement — payez une fois",
      "Vous soutenez un projet 100 % québécois",
    ],
    ctaLabel: "Nous contacter",
    ctaKind: "contact",
    contactEmail: "organismes@attentezero.ca",
    contactSubject: "Forfait Organisme — 149,99 $ à vie",
  },
  {
    id: "users",
    emoji: "🤝",
    color: "#b45309",
    gradColors: ["#78350f", "#d97706"],
    audience: "Partenaire & Soutien — À vie",
    tagline: "Pour les partenaires institutionnels et donateurs",
    priceLabel: "299,99 $",
    priceUnit: "à vie",
    perks: [
      "Accès complet à vie",
      "Reconnaissance comme partenaire de soutien",
      "Contribution directe à la mission",
      "Aucun abonnement — payez une fois",
      "Vous gardez la plateforme vivante",
    ],
    ctaLabel: "Nous contacter",
    ctaKind: "contact",
    contactEmail: "partenaires@attentezero.ca",
    contactSubject: "Forfait Partenaire & Soutien — 299,99 $ à vie",
  },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Stagger entry animations — one Animated.Value per tier card
  const cardAnims = useRef(TIERS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      120,
      cardAnims.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [cardAnims]);

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
      // Poll user state after browser closes — Stripe webhook may take a few
      // seconds to flip isPremium / plan in the DB. Try up to 6 times over ~12s.
      for (let i = 0; i < 6; i++) {
        await refreshUser();
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      Alert.alert("Paiement impossible", msg);
    } finally {
      setLoadingTier(null);
    }
  }

  function handleTierCta(tier: Tier, _idx: number) {
    if (tier.ctaKind === "premium") return handleUserPremium();
    if (tier.ctaKind === "contact") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const to = tier.contactEmail ?? CONTACT_EMAIL;
      const subject = encodeURIComponent(tier.contactSubject ?? "Demande d'information — AttenteZéro");
      Linking.openURL(`mailto:${to}?subject=${subject}`);
      return;
    }
    // Free tier — just go back
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
        {/* ── Trust strip (Stripe, sans engagement, etc.) ── */}
        <View style={[styles.trustStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.trustItem}>
            <Feather name="shield" size={14} color="#0e7e6e" />
            <Text style={[styles.trustText, { color: colors.foreground }]}>Paiement sécurisé Stripe</Text>
          </View>
          <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
          <View style={styles.trustItem}>
            <Feather name="x-circle" size={14} color="#0e7e6e" />
            <Text style={[styles.trustText, { color: colors.foreground }]}>Annulable à tout moment</Text>
          </View>
          <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
          <View style={styles.trustItem}>
            <Feather name="map-pin" size={14} color="#0e7e6e" />
            <Text style={[styles.trustText, { color: colors.foreground }]}>Fait au Québec 🇨🇦</Text>
          </View>
        </View>

        {/* ── Section: Particuliers ── */}
        <View style={styles.sectionHead}>
          <View style={[styles.sectionHeadIcon, { backgroundColor: "#10b98118" }]}>
            <Feather name="user" size={14} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionHeadTitle, { color: colors.foreground }]}>Pour les particuliers</Text>
            <Text style={[styles.sectionHeadSub, { color: colors.mutedForeground }]}>
              Trouvez de l'aide, gratuitement ou en illimité
            </Text>
          </View>
        </View>

        {TIERS.map((tier, idx) => {
          const isLoading =
            tier.ctaKind === "premium" && loadingTier === "user-premium";
          const isPopular = idx === 1; // Premium 10$ — the "best value" tier
          const anim = cardAnims[idx];
          return (
            <React.Fragment key={`tier-frag-${idx}`}>
            <Animated.View
              key={`${tier.id}-${idx}`}
              style={{
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              }}
            >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isPopular ? "#fbbf24" : tier.color + "40",
                  borderWidth: isPopular ? 2 : 1.5,
                },
              ]}
            >
              {isPopular && (
                <View style={styles.popularRibbon}>
                  <LinearGradient
                    colors={["#f59e0b", "#fbbf24"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.popularRibbonGrad}
                  >
                    <Feather name="star" size={11} color="#78350f" />
                    <Text style={styles.popularRibbonText}>LE PLUS POPULAIRE</Text>
                    <Feather name="star" size={11} color="#78350f" />
                  </LinearGradient>
                </View>
              )}
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
                        name={
                          tier.ctaKind === "premium"
                            ? "star"
                            : tier.ctaKind === "contact"
                              ? "mail"
                              : "check"
                        }
                        size={15}
                        color="#fff"
                      />
                      <Text style={styles.ctaBtnText} numberOfLines={1} adjustsFontSizeToFit>
                        {tier.ctaLabel}
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Secondary CTA — inscription gratuite pour Organisme / Partenaire */}
                {tier.ctaKind === "contact" && (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      const t =
                        tier.contactEmail === "partenaires@attentezero.ca"
                          ? "partenaire"
                          : "organisme";
                      router.push(`/register?type=${t}` as any);
                    }}
                    style={({ pressed }) => [
                      styles.ctaSecondary,
                      { borderColor: tier.color, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="user-plus" size={13} color={tier.color} />
                    <Text style={[styles.ctaSecondaryText, { color: tier.color }]} numberOfLines={1} adjustsFontSizeToFit>
                      {tier.contactEmail === "partenaires@attentezero.ca"
                        ? "S'inscrire comme Partenaire — gratuit"
                        : "S'inscrire comme Organisme — gratuit"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
            </Animated.View>
            </React.Fragment>
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

  /* Trust strip */
  trustStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 6,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    justifyContent: "center",
  },
  trustText: {
    fontSize: 10.5,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  trustDivider: {
    width: 1,
    height: 22,
  },

  /* Section heading */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  sectionHeadIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  sectionHeadSub: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },

  /* Card */
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  popularRibbon: {
    alignSelf: "center",
    marginTop: -1,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  popularRibbonGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  popularRibbonText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#78350f",
    letterSpacing: 0.8,
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
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    minHeight: 36,
  },
  ctaSecondaryText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
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
