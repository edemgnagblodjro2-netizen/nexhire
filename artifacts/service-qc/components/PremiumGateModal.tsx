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

const PERKS = [
  { icon: "bar-chart-2" as const, label: "Suivi personnalisé de vos démarches" },
  { icon: "clock" as const, label: "Historique complet hors ligne" },
  { icon: "bell" as const, label: "Alertes dès qu'un service est disponible" },
  { icon: "star" as const, label: "Résultats priorisés par l'IA" },
];

export default function PremiumGateModal({ visible, onDismiss }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleSubscribe() {
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
            colors={["#1e1b4b", "#3730a3", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGrad}
          >
            {/* Orbs */}
            <View style={styles.orb1} />
            <View style={styles.orb2} />

            <View style={styles.headerIconWrap}>
              <Feather name="star" size={30} color="#fbbf24" />
            </View>
            <Text style={styles.headerTitle}>Passez à Premium</Text>
            <Text style={styles.headerSub}>
              Vous avez utilisé vos 3 essais gratuits.{"\n"}
              Débloquez toutes les fonctionnalités avancées.
            </Text>

            {/* Price chips */}
            <View style={styles.priceRow}>
              <View style={styles.pricePill}>
                <Text style={styles.priceMain}>5 $</Text>
                <Text style={styles.priceSub}>/mois</Text>
              </View>
              <Text style={styles.priceOr}>ou</Text>
              <View style={[styles.pricePill, styles.pricePillBest]}>
                <Text style={styles.priceMain}>45 $</Text>
                <Text style={styles.priceSub}>/an</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>−25 %</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {/* Perks list */}
            <View style={[styles.perksBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {PERKS.map((p, i) => (
                <View
                  key={p.label}
                  style={[
                    styles.perkRow,
                    i < PERKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.perkIcon}>
                    <Feather name={p.icon} size={15} color="#7c3aed" />
                  </View>
                  <Text style={[styles.perkText, { color: colors.foreground }]}>{p.label}</Text>
                  <Feather name="check" size={14} color="#10b981" />
                </View>
              ))}
            </View>

            {/* Trust badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Feather name="shield" size={12} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>SSL sécurisé</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Feather name="credit-card" size={12} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>Visa · MC · Amex</Text>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>Annulable à tout moment</Text>
              </View>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleSubscribe}
              style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={["#6d28d9", "#7c3aed", "#a21caf"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtnGrad}
              >
                <Feather name="lock" size={17} color="#fff" />
                <Text style={styles.ctaBtnText}>Payer maintenant avec Stripe</Text>
                <Feather name="arrow-right" size={17} color="#fff" />
              </LinearGradient>
            </Pressable>

            {/* Dismiss */}
            <Pressable onPress={onDismiss} style={styles.laterBtn}>
              <Text style={[styles.laterText, { color: colors.mutedForeground }]}>
                Continuer en version gratuite
              </Text>
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
    gap: 10,
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
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(251,191,36,0.18)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 20,
  },

  /* Price chips */
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pricePillBest: {
    backgroundColor: "rgba(251,191,36,0.2)",
    borderColor: "rgba(251,191,36,0.35)",
    position: "relative",
  },
  priceMain: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  priceSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  priceOr: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  saveBadge: {
    backgroundColor: "#fbbf24",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  saveText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#1e1b4b",
  },

  /* Body */
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },

  /* Perks */
  perksBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  perkIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#7c3aed" + "15",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },

  /* Trust */
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#94a3b8",
  },

  /* CTA */
  ctaBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 }
      : { elevation: 8 }),
  },
  ctaBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  /* Dismiss */
  laterBtn: {
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 4,
  },
  laterText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
