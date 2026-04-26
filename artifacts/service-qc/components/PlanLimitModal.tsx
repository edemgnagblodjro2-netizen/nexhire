import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { getPlan, type PlanId } from "@/lib/planLimits";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Plan actuel de l'utilisateur (pour le message). */
  currentPlanId: PlanId;
  /** Plan recommandé pour débloquer. */
  upgradePlanId: PlanId | null;
  /** Type de limite atteinte. */
  limitKind: "clients" | "appointments" | "team" | "chat" | "favorites";
  /** Limite atteinte (ex. "10 dossiers"). */
  limitValue: number;
}

const LIMIT_LABELS: Record<Props["limitKind"], { fr: string; en: string; icon: keyof typeof Feather.glyphMap }> = {
  clients: { fr: "dossiers clients", en: "client files", icon: "folder" },
  appointments: { fr: "rendez-vous ce mois-ci", en: "appointments this month", icon: "calendar" },
  team: { fr: "membres d'équipe", en: "team members", icon: "users" },
  chat: { fr: "questions IA aujourd'hui", en: "AI chat questions today", icon: "message-circle" },
  favorites: { fr: "favoris", en: "favorites", icon: "heart" },
};

export default function PlanLimitModal({
  visible,
  onDismiss,
  currentPlanId,
  upgradePlanId,
  limitKind,
  limitValue,
}: Props) {
  const colors = useColors();
  const router = useRouter();

  const current = getPlan(currentPlanId);
  const next = upgradePlanId ? getPlan(upgradePlanId) : null;
  const labels = LIMIT_LABELS[limitKind];

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
    router.push("/premium" as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={() => {}}>
          <LinearGradient
            colors={["#0e7e6e", "#0a5e52"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerIconWrap}>
              <Feather name={labels.icon} size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Limite atteinte</Text>
            <Text style={styles.headerSub}>
              {`Vous avez utilisé vos ${limitValue} ${labels.fr} inclus dans le plan ${current.label}.`}
            </Text>
          </LinearGradient>

          {next ? (
            <View style={styles.body}>
              <View style={styles.upgradeBox}>
                <View style={styles.upgradeRow}>
                  <Feather name="arrow-up-circle" size={20} color="#0e7e6e" />
                  <Text style={[styles.upgradeTitle, { color: colors.foreground }]}>
                    Passez au plan {next.label}
                  </Text>
                </View>
                <Text style={[styles.upgradePrice, { color: colors.foreground }]}>
                  {next.priceMonthly} $/mois
                </Text>
                <Text style={[styles.upgradeTrial, { color: colors.mutedForeground }]}>
                  ✓ Essai gratuit {next.trialDays} jours · Sans engagement
                </Text>
              </View>

              <View style={styles.benefitsBox}>
                {next.features.maxClients > current.features.maxClients && (
                  <Text style={[styles.benefit, { color: colors.foreground }]}>
                    {`📁 ${next.features.maxClients === Infinity ? "Dossiers illimités" : `${next.features.maxClients} dossiers clients`}`}
                  </Text>
                )}
                {next.features.maxAppointmentsPerMonth > current.features.maxAppointmentsPerMonth && (
                  <Text style={[styles.benefit, { color: colors.foreground }]}>
                    {`📅 ${next.features.maxAppointmentsPerMonth === Infinity ? "Rendez-vous illimités" : `${next.features.maxAppointmentsPerMonth} RDV/mois`}`}
                  </Text>
                )}
                {next.features.maxTeamMembers > current.features.maxTeamMembers && (
                  <Text style={[styles.benefit, { color: colors.foreground }]}>
                    {`👥 ${next.features.maxTeamMembers === Infinity ? "Équipe illimitée" : `${next.features.maxTeamMembers} membres d'équipe`}`}
                  </Text>
                )}
                {next.features.csvExport && !current.features.csvExport && (
                  <Text style={[styles.benefit, { color: colors.foreground }]}>📊 Export CSV des dossiers</Text>
                )}
                {next.features.calendarSync && !current.features.calendarSync && (
                  <Text style={[styles.benefit, { color: colors.foreground }]}>🗓️ Synchronisation Google/Outlook</Text>
                )}
              </View>

              <Pressable style={styles.ctaPrimary} onPress={handleUpgrade}>
                <Text style={styles.ctaPrimaryText}>
                  Démarrer mon essai gratuit {next.trialDays} jours
                </Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </Pressable>

              <Pressable style={styles.ctaSecondary} onPress={onDismiss}>
                <Text style={[styles.ctaSecondaryText, { color: colors.mutedForeground }]}>
                  Plus tard
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={[styles.maxText, { color: colors.foreground }]}>
                Vous êtes déjà sur notre plan le plus complet. Contactez-nous pour des besoins
                personnalisés.
              </Text>
              <Pressable style={styles.ctaSecondary} onPress={onDismiss}>
                <Text style={[styles.ctaSecondaryText, { color: colors.mutedForeground }]}>
                  Fermer
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: { padding: 24, alignItems: "center", gap: 8 },
  headerIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  body: { padding: 20, gap: 14 },
  upgradeBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(14,126,110,0.08)",
    borderWidth: 1,
    borderColor: "rgba(14,126,110,0.2)",
    gap: 4,
  },
  upgradeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  upgradeTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  upgradePrice: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold", marginTop: 4 },
  upgradeTrial: { fontSize: 12, marginTop: 2 },
  benefitsBox: { gap: 6, paddingVertical: 4 },
  benefit: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0e7e6e",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  ctaPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  ctaSecondary: { paddingVertical: 12, alignItems: "center" },
  ctaSecondaryText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  maxText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
