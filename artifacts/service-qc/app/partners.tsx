import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PartnersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const categories = isFr
    ? [
        { icon: "heart" as const, title: "Santé et services sociaux", desc: "CIUSSS, CISSS, CLSC, fondations hospitalières et organismes communautaires en santé." },
        { icon: "home" as const, title: "Logement et hébergement", desc: "Refuges, maisons d'hébergement, OMH municipaux, organismes en itinérance." },
        { icon: "shopping-bag" as const, title: "Sécurité alimentaire", desc: "Banques alimentaires, cuisines collectives, programmes Bonne Boîte Bonne Bouffe." },
        { icon: "users" as const, title: "Familles et aînés", desc: "Centres de la petite enfance, maisons de la famille, FADOQ, associations d'aînés." },
        { icon: "book-open" as const, title: "Éducation et insertion", desc: "Carrefours jeunesse-emploi, alphabétisation, francisation, formation continue." },
        { icon: "shield" as const, title: "Soutien juridique et droits", desc: "Aide juridique, cliniques juridiques, associations de défense des droits." },
      ]
    : [
        { icon: "heart" as const, title: "Health & social services", desc: "CIUSSS, CISSS, CLSC, hospital foundations and community health organizations." },
        { icon: "home" as const, title: "Housing & shelter", desc: "Shelters, transitional housing, municipal housing offices, homelessness organizations." },
        { icon: "shopping-bag" as const, title: "Food security", desc: "Food banks, collective kitchens, Good Food Box programs." },
        { icon: "users" as const, title: "Families & seniors", desc: "Childcare centres, family resource centres, FADOQ, senior associations." },
        { icon: "book-open" as const, title: "Education & employment", desc: "Youth employment hubs, literacy programs, French integration, continuing education." },
        { icon: "shield" as const, title: "Legal support & rights", desc: "Legal aid, community legal clinics, rights advocacy associations." },
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
        <Text style={styles.headerTitle}>{isFr ? "Partenaires & soutiens" : "Partners & supporters"}</Text>
        <Text style={styles.headerSub}>
          {isFr ? "Avec le milieu communautaire québécois" : "With the Quebec community sector"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.p, { color: colors.foreground }]}>
            {isFr
              ? "AttenteZéro référence gratuitement les organismes des secteurs suivants. Nous travaillons à formaliser des partenariats avec les institutions publiques et les fondations québécoises."
              : "AttenteZéro lists organizations from the following sectors free of charge. We are formalizing partnerships with Quebec public institutions and foundations."}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Secteurs couverts" : "Sectors covered"}
        </Text>

        {categories.map((c, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: "#0e7e6e18" }]}>
              <Feather name={c.icon} size={20} color="#0e7e6e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{c.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{c.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Devenir partenaire" : "Become a partner"}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", padding: 16 }]}>
          <Text style={[styles.p, { color: colors.mutedForeground, marginBottom: 12 }]}>
            {isFr
              ? "Vous représentez un CIUSSS, une fondation, un OBNL ou un bailleur de fonds intéressé à soutenir la diffusion gratuite d'AttenteZéro auprès des Québécois·e·s vulnérables ?"
              : "Are you a CIUSSS, foundation, non-profit, or funder interested in supporting AttenteZéro's free distribution to vulnerable Quebecers?"}
          </Text>
          <Pressable
            onPress={() => Linking.openURL("mailto:attentezero5+partenariats@gmail.com?subject=Proposition%20de%20partenariat")}
            style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="mail" size={18} color="#fff" />
            <Text style={styles.ctaText}>attentezero5+partenariats@gmail.com</Text>
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
  headerTitle: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { padding: 16, gap: 12 },
  intro: { padding: 14, borderRadius: 14, borderWidth: 1 },
  p: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 2 },
  cta: { backgroundColor: "#0e7e6e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
