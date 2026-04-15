import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

const CONTACT_EMAIL = "attentezero5@gmail.com";

type Tier = {
  emoji: string;
  color: string;
  bg: string;
  darkBg: string;
  audience: string;
  tagline: string;
  price: string;
  priceNote: string | null;
  perks: string[];
  cta: string | null;
  free: boolean;
};

const TIERS: Tier[] = [
  {
    emoji: "🟢",
    color: "#10b981",
    bg: "#f0fdf4",
    darkBg: "#052e1c",
    audience: "Utilisateurs",
    tagline: "L'aide, toujours gratuite pour tous",
    price: "Gratuit",
    priceNote: "Pour toujours",
    perks: [
      "Rechercher parmi 457 services",
      "Appeler directement les organismes",
      "Chat IA multilingue (FR · EN · ES · AR · HT)",
      "SOS urgences avec tri géolocalisé",
      "Carte interactive des services",
    ],
    cta: null,
    free: true,
  },
  {
    emoji: "🟡",
    color: "#d97706",
    bg: "#fffbeb",
    darkBg: "#3b2006",
    audience: "Organismes communautaires",
    tagline: "Soyez trouvés plus rapidement",
    price: "25 $ – 300 $",
    priceNote: "par mois",
    perks: [
      "Fiche de base incluse gratuitement",
      "25 $/mois — visibilité améliorée dans les résultats",
      "100 $/mois — mise en avant + profil enrichi",
      "300 $/mois — priorité maximale + statistiques de trafic",
    ],
    cta: "Nous contacter",
    free: false,
  },
  {
    emoji: "🟣",
    color: "#7c3aed",
    bg: "#f5f3ff",
    darkBg: "#2e1a5e",
    audience: "Villes & Gouvernements",
    tagline: "Un outil de territoire pour vos citoyens",
    price: "5 000 $ – 25 000 $",
    priceNote: "par année",
    perks: [
      "Améliorer l'accès aux services publics",
      "Outil officiel pour les citoyens de votre ville",
      "Tableau de bord d'impact et de données",
      "Intégration personnalisée à votre territoire",
    ],
    cta: "Discuter avec nous",
    free: false,
  },
  {
    emoji: "🔵",
    color: "#0891b2",
    bg: "#f0f9ff",
    darkBg: "#0c2a38",
    audience: "Entreprises privées",
    tagline: "Cliniques, services privés & professionnels",
    price: "50 $ – 200 $",
    priceNote: "par mois",
    perks: [
      "Inscription dans le répertoire AttenteZéro",
      "Visibilité ciblée dans votre catégorie",
      "Génération de demandes qualifiées",
    ],
    cta: "Nous contacter",
    free: false,
  },
  {
    emoji: "🟤",
    color: "#78716c",
    bg: "#fafaf9",
    darkBg: "#1c1917",
    audience: "Dons",
    tagline: "Soutenez les organismes communautaires",
    price: "Libre",
    priceNote: "Montant à votre choix",
    perks: [
      "Contribuez directement à la mission",
      "Aidez à maintenir la plateforme gratuite",
      "Recevez un reçu fiscal (bientôt disponible)",
    ],
    cta: "Faire un don",
    free: false,
  },
];

const SUMMARY = [
  { type: "Utilisateurs", price: "✅ Gratuit", color: "#10b981" },
  { type: "Organismes", price: "25 $ – 300 $/mois", color: "#d97706" },
  { type: "Villes", price: "5 k$ – 25 k$/an", color: "#7c3aed" },
  { type: "Entreprises", price: "50 $ – 200 $/mois", color: "#0891b2" },
  { type: "Dons", price: "Libre", color: "#78716c" },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";
  const isDark = colors.background === "#09090b" || colors.background === "#0a0a0a";

  const [expanded, setExpanded] = useState<number | null>(0);

  function handleContact(tier: Tier) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tier.audience === "Dons") {
      Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Don%20AttenteZéro`);
    } else {
      const subject = encodeURIComponent(`Partenariat AttenteZéro — ${tier.audience}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nJe souhaite en savoir plus sur le partenariat ${tier.audience} pour AttenteZéro.\n\nMerci.`
      );
      Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#064e3b", "#0f766e", "#0e7e6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 12 }]}
      >
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <View style={styles.headerRow}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <View style={styles.headerBadge}>
            <Feather name="zap" size={11} color="#fff" />
            <Text style={styles.headerBadgeText}>TARIFICATION</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Notre modèle{"\n"}économique
          </Text>
          <View style={[styles.keyPhraseBox]}>
            <Feather name="heart" size={14} color="#34d399" />
            <Text style={styles.keyPhrase}>
              "L'aide est gratuite. Nous facilitons simplement l'accès rapide et intelligent à cette aide."
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* ── Logic pill ── */}
        <View style={[styles.logicBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.logicRow}>
            <View style={[styles.logicPill, { backgroundColor: "#10b981" + "18" }]}>
              <Feather name="check-circle" size={13} color="#10b981" />
              <Text style={[styles.logicText, { color: "#10b981" }]}>Ceux qui cherchent de l'aide → gratuit</Text>
            </View>
          </View>
          <View style={styles.logicRow}>
            <View style={[styles.logicPill, { backgroundColor: "#d97706" + "18" }]}>
              <Feather name="dollar-sign" size={13} color="#d97706" />
              <Text style={[styles.logicText, { color: "#d97706" }]}>Ceux qui veulent être visibles → payant</Text>
            </View>
          </View>
        </View>

        {/* ── Tier cards ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Les 5 paliers</Text>

        {TIERS.map((tier, i) => {
          const isOpen = expanded === i;
          return (
            <Pressable
              key={tier.audience}
              onPress={() => {
                Haptics.selectionAsync();
                setExpanded(isOpen ? null : i);
              }}
              style={[
                styles.tierCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isOpen ? tier.color + "60" : colors.border,
                  borderWidth: isOpen ? 1.5 : 1,
                },
              ]}
            >
              {/* Accent bar */}
              <View style={[styles.tierAccent, { backgroundColor: tier.color }]} />

              <View style={styles.tierHeader}>
                <View style={styles.tierLeft}>
                  <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                  <View style={styles.tierInfo}>
                    <Text style={[styles.tierAudience, { color: colors.foreground }]}>
                      {tier.audience}
                    </Text>
                    <Text style={[styles.tierTagline, { color: colors.mutedForeground }]}>
                      {tier.tagline}
                    </Text>
                  </View>
                </View>
                <View style={styles.tierRight}>
                  <View style={[styles.priceBadge, { backgroundColor: tier.free ? "#10b981" + "18" : tier.color + "15", borderColor: tier.color + "30" }]}>
                    <Text style={[styles.priceBadgeText, { color: tier.color }]}>{tier.price}</Text>
                  </View>
                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </View>
              </View>

              {isOpen && (
                <View style={styles.tierBody}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {tier.priceNote && (
                    <Text style={[styles.priceNote, { color: tier.color }]}>
                      {tier.price} · {tier.priceNote}
                    </Text>
                  )}

                  {tier.perks.map((perk) => (
                    <View key={perk} style={styles.perkRow}>
                      <View style={[styles.perkDot, { backgroundColor: tier.color }]} />
                      <Text style={[styles.perkText, { color: colors.foreground }]}>{perk}</Text>
                    </View>
                  ))}

                  {tier.cta && (
                    <Pressable
                      onPress={() => handleContact(tier)}
                      style={({ pressed }) => [
                        styles.ctaBtn,
                        { backgroundColor: tier.color, opacity: pressed ? 0.88 : 1 },
                      ]}
                    >
                      <Feather name="mail" size={15} color="#fff" />
                      <Text style={styles.ctaBtnText}>{tier.cta}</Text>
                      <Feather name="arrow-right" size={15} color="#fff" />
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}

        {/* ── Summary table ── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Résumé</Text>

        <View style={[styles.summaryTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SUMMARY.map((row, i) => (
            <View
              key={row.type}
              style={[
                styles.summaryRow,
                i < SUMMARY.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.summaryLeft}>
                <View style={[styles.summaryDot, { backgroundColor: row.color }]} />
                <Text style={[styles.summaryType, { color: colors.foreground }]}>{row.type}</Text>
              </View>
              <Text style={[styles.summaryPrice, { color: row.color }]}>{row.price}</Text>
            </View>
          ))}
        </View>

        {/* ── Contact box ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Partenariat%20AttenteZéro`);
          }}
          style={({ pressed }) => [
            styles.contactBox,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <View style={[styles.contactIconWrap, { backgroundColor: "#0e7e6e" + "18" }]}>
            <Feather name="mail" size={22} color="#0e7e6e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>
              Vous êtes un organisme ou une ville ?
            </Text>
            <Text style={[styles.contactEmail, { color: "#0e7e6e" }]}>
              {CONTACT_EMAIL}
            </Text>
          </View>
          <Feather name="external-link" size={16} color={colors.mutedForeground} />
        </Pressable>

        {/* ── Mission note ── */}
        <View style={[styles.missionBox, { backgroundColor: "#0e7e6e" + "10", borderColor: "#0e7e6e" + "25" }]}>
          <Feather name="heart" size={16} color="#0e7e6e" />
          <Text style={[styles.missionText, { color: colors.mutedForeground }]}>
            AttenteZéro est né pour que personne ne reste sans aide faute de ne pas savoir où chercher. L'accès à l'aide reste toujours gratuit pour les personnes vulnérables.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
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
    left: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
  headerContent: {
    gap: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  keyPhraseBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 14,
  },
  keyPhrase: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    lineHeight: 19,
  },

  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: -0.2,
  },

  /* Logic box */
  logicBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 24,
  },
  logicRow: {},
  logicPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logicText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },

  /* Tier cards */
  tierCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  tierAccent: {
    height: 4,
    width: "100%",
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  tierLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  tierEmoji: {
    fontSize: 22,
  },
  tierInfo: {
    flex: 1,
    gap: 2,
  },
  tierAudience: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  tierTagline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  tierRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  priceBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  tierBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  divider: {
    height: 1,
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  perkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    flex: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  ctaBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  /* Summary table */
  summaryTable: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryType: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  summaryPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  /* Contact */
  contactBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  contactIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contactTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  contactEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  /* Mission */
  missionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  missionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
