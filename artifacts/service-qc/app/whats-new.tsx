import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

interface UpdateEntry {
  date: string;
  title: string;
  titleEn: string;
  bullets: string[];
  bulletsEn: string[];
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

// Most recent first.
const UPDATES: UpdateEntry[] = [
  {
    date: "Avril 2026",
    title: "Couverture Canada complète",
    titleEn: "Full Canada coverage",
    icon: "map",
    color: "#0e7e6e",
    bullets: [
      "Yukon, T.N.-O. et Nunavut désormais couverts.",
      "5 800+ services dans 13 provinces et territoires.",
      "Numéros 211 provinciaux ajoutés (24 h/24, gratuits).",
      "311 municipal ajouté pour Montréal et Toronto.",
    ],
    bulletsEn: [
      "Yukon, NWT and Nunavut now covered.",
      "5,800+ services across 13 provinces and territories.",
      "Provincial 211 numbers added (24/7, toll-free).",
      "Municipal 311 added for Montréal and Toronto.",
    ],
  },
  {
    date: "Avril 2026",
    title: "Signaler un bogue, en deux touches",
    titleEn: "Report a bug, in two taps",
    icon: "alert-triangle",
    color: "#ea580c",
    bullets: [
      "Nouveau formulaire dans « Plus » → « Aide & support ».",
      "Anti-spam intégré, lecture quotidienne par notre équipe.",
      "Notification courriel automatique vers la responsable produit.",
    ],
    bulletsEn: [
      "New form under \"More\" → \"Help & support\".",
      "Built-in anti-spam, read daily by our team.",
      "Automatic email notification to the product owner.",
    ],
  },
  {
    date: "Avril 2026",
    title: "Programme ambassadeur",
    titleEn: "Ambassador program",
    icon: "users",
    color: "#0284c7",
    bullets: [
      "Recevez votre code unique pour le partager.",
      "Chaque inscription compte vers vos récompenses futures.",
      "Suivez votre impact en temps réel.",
    ],
    bulletsEn: [
      "Get your unique code to share.",
      "Each sign-up counts toward future rewards.",
      "Track your impact in real time.",
    ],
  },
  {
    date: "Mars 2026",
    title: "Recherche par province intelligente",
    titleEn: "Smarter province search",
    icon: "search",
    color: "#7c3aed",
    bullets: [
      "Cliquer sur une province affiche désormais TOUS les services de la région.",
      "Plus rapide pour trouver le bon organisme.",
    ],
    bulletsEn: [
      "Tapping a province now shows ALL services in the region.",
      "Faster to find the right organization.",
    ],
  },
  {
    date: "Mars 2026",
    title: "Assistant IA bilingue",
    titleEn: "Bilingual AI assistant",
    icon: "cpu",
    color: "#7c3aed",
    bullets: [
      "Posez votre question en français ou en anglais.",
      "L'assistant suggère les services les plus pertinents.",
      "Données 100 % locales et anonymes.",
    ],
    bulletsEn: [
      "Ask your question in French or English.",
      "The assistant suggests the most relevant services.",
      "100% local and anonymous data.",
    ],
  },
];

export default function WhatsNewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isFr ? "Quoi de neuf" : "What's new"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {UPDATES.map((u, idx) => (
          <View
            key={idx}
            style={[
              styles.entry,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.entryHeader}>
              <View style={[styles.entryIconWrap, { backgroundColor: u.color + "20" }]}>
                <Feather name={u.icon} size={18} color={u.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                  {u.date}
                </Text>
                <Text style={[styles.entryTitle, { color: colors.foreground }]}>
                  {isFr ? u.title : u.titleEn}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              {(isFr ? u.bullets : u.bulletsEn).map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: u.color }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.foreground }]}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 24, alignItems: "flex-start" },
  title: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  entry: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entryDate: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  entryTitle: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 6 },
  bulletDot: { fontSize: 18, lineHeight: 20, fontWeight: "700" },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
