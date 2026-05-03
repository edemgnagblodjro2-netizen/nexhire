import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

const TESTIMONIALS_FR = [
  { quote: "J'ai trouvé en 2 minutes une banque alimentaire à 800 m de chez moi. Ça m'a sauvé la semaine.", author: "Marie, Montréal" },
  { quote: "Ma mère âgée a enfin un outil simple pour appeler les bons numéros sans se perdre.", author: "Jean-François, Québec" },
  { quote: "En tant qu'intervenante sociale, je recommande AttenteZéro à toutes mes familles.", author: "Sophie, travailleuse sociale CIUSSS" },
];
const TESTIMONIALS_EN = [
  { quote: "I found a food bank 800 m from my home in 2 minutes. It saved my week.", author: "Marie, Montreal" },
  { quote: "My elderly mother finally has a simple tool to dial the right numbers without getting lost.", author: "Jean-François, Quebec City" },
  { quote: "As a social worker, I recommend AttenteZéro to every family I meet.", author: "Sophie, CIUSSS social worker" },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";
  const testimonials = isFr ? TESTIMONIALS_FR : TESTIMONIALS_EN;

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
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{isFr ? "À propos" : "About"}</Text>
        <Text style={styles.headerSub}>
          {isFr ? "Notre mission, notre équipe" : "Our mission, our team"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.foreground }]}>
            {isFr ? "Notre mission" : "Our mission"}
          </Text>
          <Text style={[styles.p, { color: colors.mutedForeground }]}>
            {isFr
              ? "AttenteZéro réduit le temps que les Québécoises et Québécois passent à chercher les bons services communautaires. Logement, alimentation, santé mentale, soutien aux aînés : nous rassemblons en un seul endroit les ressources locales souvent introuvables, et nous les rendons accessibles en quelques secondes, sans inscription obligatoire et sans collecte de données personnelles."
              : "AttenteZéro cuts the time Quebecers spend hunting for the right community services. Housing, food, mental health, senior support: we gather scattered local resources in one place and make them findable in seconds, with no required signup and no personal data collection."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.foreground }]}>
            {isFr ? "Le problème" : "The problem"}
          </Text>
          <Text style={[styles.p, { color: colors.mutedForeground }]}>
            {isFr
              ? "Au Québec, plus de 1,2 million de personnes vivent une situation de vulnérabilité économique, sociale ou de santé. Pourtant, l'information sur les services existe — elle est simplement dispersée entre 211, CLSC, sites municipaux, fondations privées et bouche-à-oreille. Le résultat : des heures perdues au téléphone, des familles qui abandonnent, des services débordés."
              : "Over 1.2 million Quebecers live in economic, social, or health vulnerability. The information exists — it's just scattered across 211, CLSCs, city sites, private foundations and word-of-mouth. The result: hours lost on the phone, families giving up, services overwhelmed."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.foreground }]}>
            {isFr ? "Notre approche" : "Our approach"}
          </Text>
          <View style={styles.bulletRow}>
            <Feather name="check-circle" size={18} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr ? "Gratuit pour toujours pour les personnes vulnérables" : "Free forever for vulnerable people"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check-circle" size={18} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr ? "Aucune collecte de données identifiables" : "No identifiable data collected"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check-circle" size={18} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr ? "Bilingue FR/EN, conforme à la Loi 25" : "Bilingual FR/EN, compliant with Quebec Law 25"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check-circle" size={18} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr ? "Référencement gratuit pour les organismes communautaires" : "Free listing for community organizations"}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h2, { color: colors.foreground }]}>
            {isFr ? "L'équipe" : "The team"}
          </Text>
          <Text style={[styles.p, { color: colors.mutedForeground }]}>
            {isFr
              ? "AttenteZéro est porté par une petite équipe québécoise indépendante, en lien avec des intervenant·e·s du milieu communautaire. Nous opérons en mode minimal pour rester centrés sur l'utilité concrète aux familles."
              : "AttenteZéro is run by a small independent Quebec team, in close contact with community-sector workers. We operate in minimal mode to stay focused on real impact for families."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Feather name="zap" size={18} color="#0e7e6e" />
            <Text style={[styles.h2, { color: colors.foreground, marginBottom: 0 }]}>
              {isFr ? "Nouveautés v1.1.2" : "What's new in v1.1.2"}
            </Text>
          </View>
          <Text style={[styles.p, { color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }]}>
            {isFr ? "Mai 2026 — 5 338 services dans 13 provinces et territoires" : "May 2026 — 5,338 services across 13 provinces and territories"}
          </Text>
          <View style={styles.bulletRow}>
            <Feather name="message-circle" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "Aide IA : nouvel onboarding guidé en 3 étapes (GPS → catégorie → résultats)"
                : "AI Help: new 3-step guided onboarding (GPS → category → results)"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="phone-call" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "Diagnostic IA : redirection automatique vers le 211 de votre province si aucun service trouvé"
                : "AI Diagnosis: auto-redirect to your province's 211 line when no service is found"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="globe" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "Couverture pancanadienne : 988 et services nationaux désormais inclus partout"
                : "Pan-Canadian coverage: 988 and national services now included everywhere"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="map-pin" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "11 nouveaux raccourcis chat (parent monoparental, manteau d'hiver, foyer violent...) en 5 langues"
                : "11 new chat shortcuts (single parent, winter coat, violent home...) in 5 languages"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="info" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "7 nouvelles questions fréquentes dans l'écran Aide"
                : "7 new FAQs in the Help screen"}
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check-circle" size={16} color="#0e7e6e" />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>
              {isFr
                ? "Fiche MIFI Montréal enrichie (adresse, horaires, ligne directe 514 864-9191)"
                : "MIFI Montreal entry enriched (address, hours, direct line 514 864-9191)"}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Témoignages" : "Testimonials"}
        </Text>
        {testimonials.map((t, i) => (
          <View key={i} style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="message-circle" size={18} color="#0e7e6e" style={{ marginBottom: 6 }} />
            <Text style={[styles.quote, { color: colors.foreground }]}>« {t.quote} »</Text>
            <Text style={[styles.author, { color: colors.mutedForeground }]}>— {t.author}</Text>
          </View>
        ))}
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  h2: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8 },
  p: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 12, marginBottom: 4 },
  quoteCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  quote: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  author: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 6 },
});
