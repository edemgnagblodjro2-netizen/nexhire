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

const CONTACT_EMAIL = "attentezero5@gmail.com";

type TierId = "users" | "orgs" | "cities" | "enterprise" | "donations";

type Tier = {
  id: TierId;
  emoji: string;
  color: string;
  gradColors: readonly [string, string];
  audience: string;
  tagline: string;
  priceLabel: string;
  priceUnit: string | null;
  perks: string[];
  ctaLabel: string | null;
  isFree: boolean;
};

const TIERS: Tier[] = [
  {
    id: "users",
    emoji: "🟢",
    color: "#10b981",
    gradColors: ["#065f46", "#10b981"],
    audience: "Utilisateurs",
    tagline: "L'aide, toujours gratuite",
    priceLabel: "GRATUIT",
    priceUnit: null,
    perks: [
      "Rechercher parmi 457 services",
      "Appeler directement les organismes",
      "Chat IA multilingue (FR · EN · ES · AR · HT)",
      "SOS urgences avec tri géolocalisé",
      "Carte interactive des services",
    ],
    ctaLabel: null,
    isFree: true,
  },
  {
    id: "orgs",
    emoji: "🟡",
    color: "#d97706",
    gradColors: ["#92400e", "#d97706"],
    audience: "Organismes communautaires",
    tagline: "Soyez trouvés plus rapidement",
    priceLabel: "25 $–300 $",
    priceUnit: "/mois",
    perks: [
      "Fiche de base incluse gratuitement",
      "Visibilité améliorée dans les résultats",
      "Profil enrichi + mise en avant",
      "Priorité maximale + statistiques de trafic",
    ],
    ctaLabel: "Nous contacter",
    isFree: false,
  },
  {
    id: "cities",
    emoji: "🟣",
    color: "#7c3aed",
    gradColors: ["#3b0764", "#7c3aed"],
    audience: "Villes & Gouvernements",
    tagline: "Un outil de territoire",
    priceLabel: "5 000 $–25 000 $",
    priceUnit: "/an",
    perks: [
      "Améliorer l'accès aux services publics",
      "Outil officiel pour vos citoyens",
      "Tableau de bord d'impact et données",
      "Intégration personnalisée au territoire",
    ],
    ctaLabel: "Discuter avec nous",
    isFree: false,
  },
  {
    id: "enterprise",
    emoji: "🔵",
    color: "#0891b2",
    gradColors: ["#0c4a6e", "#0891b2"],
    audience: "Entreprises privées",
    tagline: "Cliniques, services professionnels",
    priceLabel: "50 $–200 $",
    priceUnit: "/mois",
    perks: [
      "Inscription dans le répertoire AttenteZéro",
      "Visibilité ciblée dans votre catégorie",
      "Génération de demandes qualifiées",
    ],
    ctaLabel: "Nous contacter",
    isFree: false,
  },
  {
    id: "donations",
    emoji: "🟤",
    color: "#78716c",
    gradColors: ["#44403c", "#78716c"],
    audience: "Dons",
    tagline: "Soutenez la mission",
    priceLabel: "Libre",
    priceUnit: null,
    perks: [
      "Contribuez directement à la mission",
      "Maintenez la plateforme gratuite",
      "Reçu fiscal (bientôt disponible)",
    ],
    ctaLabel: "Faire un don",
    isFree: false,
  },
];

const SUMMARY_ROWS = [
  { label: "Utilisateurs", price: "✅ Gratuit", color: "#10b981" },
  { label: "Organismes", price: "25 $–300 $/mois", color: "#d97706" },
  { label: "Villes", price: "5 k$–25 k$/an", color: "#7c3aed" },
  { label: "Entreprises", price: "50 $–200 $/mois", color: "#0891b2" },
  { label: "Dons", price: "Libre", color: "#78716c" },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openId, setOpenId] = useState<TierId | null>("users");

  function handleContact(tier: Tier) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const subject = encodeURIComponent(
      tier.id === "donations"
        ? "Don — AttenteZéro"
        : `Partenariat AttenteZéro — ${tier.audience}`
    );
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite en savoir plus sur ${tier.audience === "Dons" ? "les dons à" : "le partenariat"} AttenteZéro.\n\nMerci.`
    );
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
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
            <Text style={styles.chipText}>MODÈLE ÉCONOMIQUE</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Tarification</Text>

        <View style={styles.keyPhraseRow}>
          <Feather name="heart" size={13} color="#34d399" />
          <Text style={styles.keyPhrase} numberOfLines={3}>
            "L'aide est gratuite. Nous facilitons simplement l'accès rapide et intelligent à cette aide."
          </Text>
        </View>

        {/* Logic pills */}
        <View style={styles.logicRow}>
          <View style={[styles.logicPill, { backgroundColor: "rgba(16,185,129,0.2)", borderColor: "rgba(52,211,153,0.35)" }]}>
            <Feather name="check-circle" size={11} color="#34d399" />
            <Text style={[styles.logicText, { color: "#34d399" }]}>Chercheurs d'aide → toujours gratuit</Text>
          </View>
          <View style={[styles.logicPill, { backgroundColor: "rgba(251,191,36,0.18)", borderColor: "rgba(251,191,36,0.3)" }]}>
            <Feather name="dollar-sign" size={11} color="#fbbf24" />
            <Text style={[styles.logicText, { color: "#fbbf24" }]}>Organismes visibles → formule payante</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* ─── Tier accordion ─── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Les 5 paliers</Text>

        {TIERS.map((tier) => {
          const isOpen = openId === tier.id;
          return (
            <View
              key={tier.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: isOpen ? tier.color + "55" : colors.border,
                  borderWidth: isOpen ? 1.5 : 1,
                },
              ]}
            >
              {/* Colored left bar */}
              <View style={[styles.leftBar, { backgroundColor: tier.color }]} />

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setOpenId(isOpen ? null : tier.id);
                }}
                style={styles.cardHeader}
              >
                <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: colors.foreground }]} numberOfLines={1}>
                    {tier.audience}
                  </Text>
                  <Text style={[styles.tierTagline, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {tier.tagline}
                  </Text>
                </View>
                <View style={[styles.priceBadge, { backgroundColor: tier.color + "18" }]}>
                  <Text style={[styles.priceText, { color: tier.color }]} numberOfLines={1} adjustsFontSizeToFit>
                    {tier.priceLabel}
                  </Text>
                  {tier.priceUnit && (
                    <Text style={[styles.priceUnit, { color: tier.color + "cc" }]}>{tier.priceUnit}</Text>
                  )}
                </View>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                  style={{ marginLeft: 6, flexShrink: 0 }}
                />
              </Pressable>

              {isOpen && (
                <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
                  {tier.perks.map((perk, idx) => (
                    <View key={idx} style={styles.perkRow}>
                      <View style={[styles.perkDot, { backgroundColor: tier.color }]} />
                      <Text style={[styles.perkText, { color: colors.foreground }]}>{perk}</Text>
                    </View>
                  ))}

                  {tier.ctaLabel && (
                    <Pressable
                      onPress={() => handleContact(tier)}
                      style={({ pressed }) => [
                        styles.ctaBtn,
                        { backgroundColor: tier.color, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Feather name="mail" size={14} color="#fff" />
                      <Text style={styles.ctaBtnText}>{tier.ctaLabel}</Text>
                      <Feather name="external-link" size={13} color="rgba(255,255,255,0.75)" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ─── Summary table ─── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Résumé</Text>

        <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {SUMMARY_ROWS.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.tableRow,
                i < SUMMARY_ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.tableLeft}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text style={[styles.tableLabel, { color: colors.foreground }]}>{row.label}</Text>
              </View>
              <Text style={[styles.tablePrice, { color: row.color }]} numberOfLines={1} adjustsFontSizeToFit>
                {row.price}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Contact CTA ─── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Partenariat%20AttenteZ%C3%A9ro`);
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
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>Organisme ou ville ?</Text>
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
            AttenteZéro est né pour que personne ne reste sans aide. L'accès reste toujours gratuit pour les personnes vulnérables — c'est notre engagement fondamental.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ─── Header ─── */
  header: {
    paddingHorizontal: 18,
    paddingBottom: 20,
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
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  keyPhraseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keyPhrase: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    lineHeight: 18,
  },
  logicRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  logicPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  logicText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },

  /* ─── Scroll body ─── */
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    marginTop: 4,
    marginBottom: 2,
  },

  /* ─── Tier card ─── */
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  leftBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 13,
    gap: 10,
    minWidth: 0,
  },
  tierEmoji: {
    fontSize: 20,
    flexShrink: 0,
  },
  tierInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  tierName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tierTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  priceBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: 110,
  },
  priceText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  priceUnit: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    lineHeight: 12,
  },
  cardBody: {
    paddingLeft: 16,
    paddingRight: 12,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 7,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    minWidth: 0,
  },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  perkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  ctaBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },

  /* ─── Summary table ─── */
  table: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  tableLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    flexShrink: 0,
  },
  tableLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  tablePrice: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    flexShrink: 0,
    maxWidth: 140,
    textAlign: "right",
  },

  /* ─── Contact card ─── */
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
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

  /* ─── Mission note ─── */
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
