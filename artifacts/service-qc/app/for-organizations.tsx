import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForOrganizationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const benefits = isFr
    ? [
        { icon: "gift" as const, title: "Référencement 100% gratuit", desc: "Aucun frais d'inscription, aucun abonnement, jamais." },
        { icon: "users" as const, title: "Visibilité auprès des familles", desc: "Vos services apparaissent automatiquement aux personnes qui en ont besoin, dans leur région." },
        { icon: "edit" as const, title: "Vous gardez le contrôle", desc: "Mettez à jour vos coordonnées, horaires et critères d'admissibilité par simple courriel." },
        { icon: "shield" as const, title: "Aucune publicité concurrente", desc: "Nous n'affichons jamais de publicité dans les fiches d'organismes communautaires." },
        { icon: "bar-chart-2" as const, title: "Statistiques anonymes", desc: "Sur demande, nous partageons les volumes de recherche pour votre catégorie et région." },
      ]
    : [
        { icon: "gift" as const, title: "100% free listing", desc: "No signup fee, no subscription, ever." },
        { icon: "users" as const, title: "Visibility to families", desc: "Your services appear automatically to people who need them, in their region." },
        { icon: "edit" as const, title: "You stay in control", desc: "Update your contact info, hours and eligibility criteria with a simple email." },
        { icon: "shield" as const, title: "No competing ads", desc: "We never display ads inside community-organization listings." },
        { icon: "bar-chart-2" as const, title: "Anonymous stats", desc: "On request, we share search volumes for your category and region." },
      ];

  const steps = isFr
    ? [
        "Envoyez un courriel à organismes@attentezero.ca avec le nom de votre organisme.",
        "Nous vous renvoyons un formulaire court (nom, services, horaires, critères, contacts).",
        "Votre fiche est validée puis publiée dans l'application sous 5 jours ouvrables.",
        "Vous pouvez la modifier à tout moment, gratuitement, par courriel.",
      ]
    : [
        "Email organismes@attentezero.ca with your organization's name.",
        "We send back a short form (name, services, hours, criteria, contacts).",
        "Your listing is reviewed and published in the app within 5 business days.",
        "You can update it anytime, free of charge, by email.",
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
        <Text style={styles.headerTitle}>
          {isFr ? "Pour les organismes" : "For organizations"}
        </Text>
        <Text style={styles.headerSub}>
          {isFr ? "Référencez vos services gratuitement" : "List your services free of charge"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.intro, { backgroundColor: "#0e7e6e", borderColor: "#0a5e52" }]}>
          <Text style={styles.introTitle}>
            {isFr ? "Vous représentez un organisme communautaire ?" : "Do you run a community organization?"}
          </Text>
          <Text style={styles.introText}>
            {isFr
              ? "Inscrivez vos services en quelques minutes. Aucun frais, jamais. Aucune publicité dans votre fiche."
              : "List your services in a few minutes. No fee, ever. No ads in your listing."}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Pourquoi nous rejoindre" : "Why join us"}
        </Text>
        {benefits.map((b, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: "#0e7e6e18" }]}>
              <Feather name={b.icon} size={20} color="#0e7e6e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{b.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Comment s'inscrire (4 étapes)" : "How to sign up (4 steps)"}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", padding: 16 }]}>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => Linking.openURL("mailto:organismes@attentezero.ca?subject=Inscription%20organisme%20communautaire")}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="mail" size={18} color="#fff" />
          <Text style={styles.ctaText}>
            {isFr ? "Inscrire mon organisme" : "Register my organization"}
          </Text>
        </Pressable>
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
  intro: { padding: 16, borderRadius: 14, borderWidth: 1 },
  introTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 6 },
  introText: { color: "rgba(255,255,255,0.92)", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 2 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#0e7e6e", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", paddingTop: 4 },
  cta: { backgroundColor: "#0e7e6e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
