import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  userEmail?: string | null;
  remaining: number;
}

const FREE_FEATURES = [
  { icon: "search" as const, label: "Rechercher parmi 531+ services" },
  { icon: "phone-call" as const, label: "Appeler directement les organismes" },
  { icon: "cpu" as const, label: "Chat IA multilingue (FR · EN · ES · AR · HT)" },
  { icon: "alert-triangle" as const, label: "SOS urgences avec tri GPS" },
];

const PARTNER_TIERS = [
  { label: "Travailleur", price: "19 $/mois", color: "#0e7e6e" },
  { label: "Organisme", price: "39 $/mois", color: "#d97706" },
  { label: "Plus", price: "89 $/mois", color: "#7c3aed" },
  { label: "Institution", price: "199 $/mois", color: "#0891b2" },
];

export default function PremiumGateModal({ visible, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleViewPricing() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
    router.push("/premium" as any);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Gradient header */}
          <LinearGradient
            colors={["#064e3b", "#0f766e", "#0e7e6e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGrad}
          >
            <View style={styles.orb1} />
            <View style={styles.orb2} />

            <View style={styles.headerIconWrap}>
              <Feather name="heart" size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Toujours gratuit pour vous</Text>
            <Text style={styles.headerSub}>
              "L'aide est gratuite.{"\n"}Nous facilitons simplement l'accès rapide et intelligent à cette aide."
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            {/* Free features list */}
            <View style={[styles.featuresBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {FREE_FEATURES.map((f, i) => (
                <View
                  key={f.label}
                  style={[
                    styles.featureRow,
                    i < FREE_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: "#10b981" + "15" }]}>
                    <Feather name={f.icon} size={14} color="#10b981" />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f.label}</Text>
                  <Feather name="check" size={14} color="#10b981" />
                </View>
              ))}
            </View>

            {/* B2B note */}
            <View style={[styles.partnerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.partnerTitle, { color: colors.foreground }]}>
                Vous êtes un organisme ou une ville ?
              </Text>
              <View style={styles.partnerTiers}>
                {PARTNER_TIERS.map((t) => (
                  <View key={t.label} style={[styles.partnerPill, { backgroundColor: t.color + "15", borderColor: t.color + "30" }]}>
                    <Text style={[styles.partnerPillLabel, { color: t.color }]}>{t.label}</Text>
                    <Text style={[styles.partnerPillPrice, { color: t.color }]}>{t.price}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={handleViewPricing}
                style={({ pressed }) => [styles.partnerLink, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[styles.partnerLinkText, { color: "#0e7e6e" }]}>Voir les partenariats →</Text>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={["#064e3b", "#0f766e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtnGrad}
              >
                <Feather name="arrow-right" size={17} color="#fff" />
                <Text style={styles.ctaBtnText}>Continuer — c'est gratuit</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 20 }
      : { elevation: 30 }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },

  /* Header */
  headerGrad: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 8,
    overflow: "hidden",
    alignItems: "center",
  },
  orb1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -50,
    right: -40,
  },
  orb2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: 10,
  },
  headerIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 18,
  },

  /* Body */
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 12,
  },

  /* Features */
  featuresBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },

  /* Partner box */
  partnerBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  partnerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  partnerTiers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  partnerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  partnerPillLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  partnerPillPrice: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  partnerLink: {
    alignSelf: "flex-start",
  },
  partnerLinkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  /* CTA */
  ctaBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#0e7e6e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 }
      : { elevation: 8 }),
  },
  ctaBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
