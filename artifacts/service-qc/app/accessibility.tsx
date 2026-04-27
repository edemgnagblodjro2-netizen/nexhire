import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AccessibilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const features = isFr
    ? [
        { icon: "type" as const, title: "Texte adaptable", desc: "L'application respecte la taille de texte choisie dans les réglages d'accessibilité de votre téléphone." },
        { icon: "eye" as const, title: "Contrastes élevés", desc: "Couleurs vérifiées WCAG 2.1 niveau AA : contraste minimum 4,5:1 sur tous les textes." },
        { icon: "moon" as const, title: "Mode sombre complet", desc: "Adapté automatiquement aux réglages système, pour réduire la fatigue oculaire." },
        { icon: "mic" as const, title: "Compatible TalkBack / VoiceOver", desc: "Tous les boutons et icônes sont étiquetés pour les lecteurs d'écran Android et iOS." },
        { icon: "phone" as const, title: "Cibles tactiles larges", desc: "Tous les boutons font au moins 44 × 44 points, conformément aux recommandations Apple et Google." },
        { icon: "globe" as const, title: "Bilingue FR/EN intégral", desc: "Bascule instantanée français/anglais, sans redémarrage de l'application." },
      ]
    : [
        { icon: "type" as const, title: "Adaptive text", desc: "The app respects the text size chosen in your phone's accessibility settings." },
        { icon: "eye" as const, title: "High contrast", desc: "WCAG 2.1 AA verified colors: minimum 4.5:1 contrast on all text." },
        { icon: "moon" as const, title: "Full dark mode", desc: "Adapts automatically to system settings to reduce eye strain." },
        { icon: "mic" as const, title: "TalkBack / VoiceOver compatible", desc: "All buttons and icons are labelled for Android and iOS screen readers." },
        { icon: "phone" as const, title: "Large touch targets", desc: "All buttons are at least 44 × 44 points, per Apple and Google guidelines." },
        { icon: "globe" as const, title: "Full FR/EN bilingual", desc: "Instant French/English toggle, no app restart needed." },
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
        <Text style={styles.headerTitle}>{isFr ? "Accessibilité" : "Accessibility"}</Text>
        <Text style={styles.headerSub}>
          {isFr ? "Conforme aux standards WCAG 2.1 AA" : "Compliant with WCAG 2.1 AA standards"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="check-circle" size={22} color="#0e7e6e" />
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            {isFr
              ? "Notre engagement : rendre les services communautaires accessibles à toutes et tous, peu importe les capacités."
              : "Our commitment: making community services accessible to everyone, regardless of ability."}
          </Text>
        </View>

        {features.map((f, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: "#0e7e6e18" }]}>
              <Feather name={f.icon} size={20} color="#0e7e6e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Réglages système" : "System settings"}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openSettings();
          }}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="settings" size={18} color="#fff" />
          <Text style={styles.ctaText}>
            {isFr ? "Ouvrir les réglages d'accessibilité" : "Open accessibility settings"}
          </Text>
        </Pressable>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          {isFr
            ? "Astuce : pour agrandir le texte de l'application, ouvrez les réglages de votre téléphone → Affichage → Taille du texte."
            : "Tip: to enlarge app text, open your phone settings → Display → Font size."}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "Signaler un obstacle" : "Report a barrier"}
        </Text>
        <Pressable
          onPress={() => Linking.openURL("mailto:accessibilite@attentezero.ca")}
          style={({ pressed }) => [styles.ctaSecondary, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="mail" size={18} color="#0e7e6e" />
          <Text style={[styles.ctaSecondaryText, { color: "#0e7e6e" }]}>
            accessibilite@attentezero.ca
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
  headerTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { padding: 16, gap: 12 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  bannerText: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20 },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  cta: { backgroundColor: "#0e7e6e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  ctaSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  ctaSecondaryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  note: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 8 },
});
