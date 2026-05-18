import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const sections = isFr
    ? [
        { title: "1. Données collectées", body: "AttenteZéro ne collecte aucune donnée identifiable obligatoire. La création d'un compte est facultative. Si vous choisissez d'en créer un, seul votre courriel et un mot de passe chiffré sont conservés." },
        { title: "2. Données de localisation", body: "Votre position géographique n'est jamais enregistrée sur nos serveurs. Elle est utilisée uniquement, en local sur votre appareil, pour calculer la distance vers les services proches. Vous pouvez la désactiver à tout moment dans les réglages de votre téléphone." },
        { title: "3. Données de recherche", body: "Vos recherches ne sont pas associées à votre compte. Seuls des compteurs anonymes par catégorie et par province nous aident à prioriser nos améliorations." },
        { title: "4. Cookies et traceurs", body: "L'application n'intègre aucun pisteur publicitaire ni outil d'analyse comportementale tiers (pas de Google Analytics, pas de Meta SDK, pas de Mixpanel)." },
        { title: "5. Intelligence artificielle (OpenAI)", body: "Le chat IA de l'application utilise le service OpenAI (GPT-4o-mini et Whisper). Lorsque vous envoyez un message texte ou vocal à l'assistant, ce contenu est transmis à OpenAI pour traitement. OpenAI ne conserve pas ces données au-delà du traitement immédiat. Aucune information identifiable (nom, courriel) n'est envoyée à OpenAI. Pour en savoir plus : openai.com/fr/policies/privacy-policy." },
        { title: "6. Partage avec des tiers", body: "Nous ne vendons jamais vos données. En dehors d'OpenAI (décrit ci-dessus), aucune information n'est partagée avec des annonceurs, courtiers ou organismes publicitaires." },
        { title: "7. Vos droits (Loi 25)", body: "Conformément à la Loi 25 du Québec sur la protection des renseignements personnels, vous pouvez : (a) accéder à vos données ; (b) les corriger ; (c) demander leur suppression complète ; (d) déposer plainte auprès de la Commission d'accès à l'information du Québec." },
        { title: "8. Hébergement et chiffrement", body: "Les données de compte (courriel + mot de passe haché) sont hébergées sur des serveurs sécurisés au Canada. Toutes les communications utilisent le protocole TLS 1.3." },
        { title: "9. Conservation", body: "Les comptes inactifs depuis plus de 24 mois sont supprimés automatiquement. Vous pouvez supprimer votre compte vous-même à tout moment depuis l'onglet Profil." },
        { title: "10. Personne responsable", body: "Toute demande relative aux renseignements personnels peut être envoyée à : confidentialite@attentezero.ca. Nous répondons sous 30 jours, conformément à la Loi 25." },
      ]
    : [
        { title: "1. Data collected", body: "AttenteZéro collects no required identifiable data. Account creation is optional. If you create one, only your email and a hashed password are stored." },
        { title: "2. Location data", body: "Your location is never stored on our servers. It is used only, locally on your device, to compute distance to nearby services. You can disable it any time in your phone settings." },
        { title: "3. Search data", body: "Your searches are not linked to your account. Only anonymous counters per category and province help us prioritize improvements." },
        { title: "4. Cookies & trackers", body: "The app contains no advertising trackers or third-party behavioural analytics (no Google Analytics, no Meta SDK, no Mixpanel)." },
        { title: "5. Artificial intelligence (OpenAI)", body: "The AI chat feature uses OpenAI services (GPT-4o-mini and Whisper). When you send a text or voice message to the assistant, that content is transmitted to OpenAI for processing. OpenAI does not retain your data beyond the immediate response. No identifiable information (name, email) is sent to OpenAI. Learn more: openai.com/en/policies/privacy-policy." },
        { title: "6. Sharing with third parties", body: "We never sell your data. Beyond OpenAI (described above), no information is shared with advertisers, brokers, or marketing organizations." },
        { title: "7. Your rights (Law 25)", body: "Per Quebec Law 25 on personal information protection, you may: (a) access your data; (b) correct it; (c) request full deletion; (d) file a complaint with the Quebec Access to Information Commission." },
        { title: "8. Hosting & encryption", body: "Account data (email + hashed password) is hosted on secure Canadian servers. All communications use TLS 1.3." },
        { title: "9. Retention", body: "Accounts inactive for over 24 months are deleted automatically. You can delete your account yourself any time from the Profile tab." },
        { title: "10. Privacy officer", body: "Any personal-information request can be sent to: confidentialite@attentezero.ca. We respond within 30 days, per Law 25." },
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
        <Text style={styles.headerTitle}>{isFr ? "Confidentialité" : "Privacy"}</Text>
        <Text style={styles.headerSub}>
          {isFr ? "Conforme à la Loi 25 du Québec" : "Compliant with Quebec Law 25"}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.badgeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="shield" size={20} color="#0e7e6e" />
          <Text style={[styles.badgeText, { color: colors.foreground }]}>
            {isFr ? "Aucune publicité, aucun traceur, aucune revente." : "No ads, no trackers, no resale."}
          </Text>
        </View>

        {sections.map((s, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.h2, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.p, { color: colors.mutedForeground }]}>{s.body}</Text>
          </View>
        ))}

        <Pressable
          onPress={() => Linking.openURL("mailto:confidentialite@attentezero.ca")}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="mail" size={18} color="#fff" />
          <Text style={styles.ctaText}>
            {isFr ? "Écrire au responsable confidentialité" : "Email the privacy officer"}
          </Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          {isFr ? "Dernière mise à jour : avril 2026" : "Last updated: April 2026"}
        </Text>
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
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  badgeText: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  h2: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 6 },
  p: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  cta: { backgroundColor: "#0e7e6e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
});
