import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServicesData } from "@/contexts/ServicesContext";

export default function ImpactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const { services } = useServicesData();
  const servicesCount = services.length;
  const categoriesCount = new Set(services.map((s) => s.category)).size;
  const provincesCount = 13;

  const stats = [
    { icon: "map-pin" as const, value: `${servicesCount}+`, label: isFr ? "Services référencés" : "Listed services", color: "#0e7e6e" },
    { icon: "grid" as const, value: `${categoriesCount}`, label: isFr ? "Catégories de besoin" : "Need categories", color: "#0284c7" },
    { icon: "globe" as const, value: `${provincesCount}`, label: isFr ? "Provinces et territoires" : "Provinces & territories", color: "#7c3aed" },
    { icon: "clock" as const, value: "< 30s", label: isFr ? "Pour trouver un service" : "To find a service", color: "#d97706" },
    { icon: "users" as const, value: "100%", label: isFr ? "Gratuit pour les personnes vulnérables" : "Free for vulnerable people", color: "#e11d48" },
    { icon: "shield" as const, value: "0", label: isFr ? "Pisteur publicitaire" : "Advertising trackers", color: "#059669" },
  ];

  const milestones = isFr
    ? [
        { date: "2025", text: "Lancement de la version bêta à Montréal." },
        { date: "Début 2026", text: "Couverture renforcée à 3 268 services partout au Québec." },
        { date: "2026", text: "Publication sur Google Play et conformité Loi 25." },
        { date: "Objectif 2027", text: "Partenariat avec 50 organismes communautaires québécois." },
      ]
    : [
        { date: "2025", text: "Beta launch in Montreal." },
        { date: "Early 2026", text: "Coverage strengthened to 3,268 services across Quebec." },
        { date: "2026", text: "Google Play release and Law 25 compliance." },
        { date: "2027 goal", text: "Partner with 50 Quebec community organizations." },
      ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#0e7e6e", "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 8 }]}
      >
        <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={styles.backBtn} hitSlop={12}>
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{isFr ? "Notre impact" : "Our impact"}</Text>
        <Text style={styles.headerSub}>
          {isFr ? "Mesures publiques, mises à jour mensuelles" : "Public metrics, updated monthly"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.grid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
                <Feather name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Étapes clés" : "Key milestones"}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {milestones.map((m, i) => (
            <View key={i} style={[styles.timelineRow, i === milestones.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineDate, { color: "#0e7e6e" }]}>{m.date}</Text>
                <Text style={[styles.timelineText, { color: colors.foreground }]}>{m.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Transparence" : "Transparency"}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.p, { color: colors.mutedForeground }]}>
            {isFr
              ? "Nous publions chaque année un rapport d'impact court et public : nombre de services référencés, catégories les plus consultées, communautés desservies, jalons techniques. Aucune donnée personnelle n'y figure jamais."
              : "Each year we publish a short, public impact report: services listed, most-searched categories, communities served, technical milestones. No personal data is ever included."}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                isFr ? "Rapport 2026" : "2026 Report",
                isFr
                  ? "Le premier rapport d'impact public sera disponible en décembre 2026. Inscrivez-vous via la page « À propos » pour être notifié."
                  : "The first public impact report will be available in December 2026. Subscribe via the About page to get notified.",
              );
            }}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="download" size={18} color="#fff" />
            <Text style={styles.ctaText}>
              {isFr ? "Rapport d'impact 2026 (à venir)" : "2026 Impact Report (coming soon)"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, justifyContent: "center", marginBottom: 4, marginLeft: -6 },
  headerTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { padding: 16, gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flexBasis: "47%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 14 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb55" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0e7e6e", marginTop: 6 },
  timelineDate: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  timelineText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 2 },
  p: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 12 },
  cta: { backgroundColor: "#0e7e6e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
