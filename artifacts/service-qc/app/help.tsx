import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

interface FaqItem {
  q: string;
  qEn: string;
  a: string;
  aEn: string;
}

const FAQ: FaqItem[] = [
  {
    q: "Comment activer la géolocalisation ?",
    qEn: "How do I enable location?",
    a: "Allez dans les réglages de votre téléphone → AttenteZéro → Localisation, puis choisissez « Lorsque l'app est utilisée ». Cela nous permet de proposer les services les plus proches sans jamais conserver votre position.",
    aEn: "Open your phone settings → AttenteZéro → Location, then pick \"While using the app\". This lets us suggest the closest services without ever storing your location.",
  },
  {
    q: "Mes données personnelles sont-elles partagées ?",
    qEn: "Is my personal data shared?",
    a: "Jamais. AttenteZéro ne vend ni ne partage vos données. Aucun texte de recherche, aucune adresse précise, aucune information identifiable n'est conservée. Seuls des compteurs anonymes par province servent à orienter notre travail.",
    aEn: "Never. AttenteZéro does not sell or share your data. No search text, no exact address, no identifiable information is kept. Only anonymous counters per province help us prioritize our work.",
  },
  {
    q: "Pourquoi certains services affichent « Bientôt » ?",
    qEn: "Why do some services show \"Coming soon\"?",
    a: "Nous étendons progressivement la couverture vers les 13 provinces et territoires. Si un organisme de votre région n'apparaît pas, signalez-le via « Signaler un bogue » et nous l'ajouterons en priorité.",
    aEn: "We're rolling coverage out to all 13 provinces and territories. If your local organization is missing, send us a note via \"Report a bug\" and we'll prioritize it.",
  },
  {
    q: "Qu'est-ce que le « 211 » ?",
    qEn: "What is \"211\"?",
    a: "Le 211 est un service téléphonique gratuit, confidentiel et offert 24 h/24, 7 j/7 dans la plupart des provinces et territoires. Une intervenante vous oriente vers les bons organismes communautaires (logement, alimentation, santé mentale, etc.).",
    aEn: "211 is a free, confidential telephone service available 24/7 in most provinces and territories. A specialist will direct you to the right community organizations (housing, food, mental health, etc.).",
  },
  {
    q: "Comment signaler un bogue ou une donnée incorrecte ?",
    qEn: "How do I report a bug or incorrect data?",
    a: "Onglet « Plus » → « Signaler un bogue ». Décrivez le problème en quelques mots. Nous lisons chaque signalement.",
    aEn: "Tab \"More\" → \"Report a bug\". Describe the issue in a few words. We read every report.",
  },
  {
    q: "Combien coûte AttenteZéro ?",
    qEn: "How much does AttenteZéro cost?",
    a: "L'application est gratuite pour tous, et le restera pour les personnes vulnérables. Le forfait Premium (optionnel) offre l'historique illimité et soutient le maintien de la plateforme.",
    aEn: "The app is free for everyone, and will always stay free for vulnerable people. The optional Premium plan adds unlimited history and helps fund the platform.",
  },
  {
    q: "Puis-je utiliser l'app hors ligne ?",
    qEn: "Can I use the app offline?",
    a: "La liste de services est mise en cache au premier lancement, donc vous pouvez consulter les coordonnées même sans connexion. L'assistant IA et les recherches en temps réel exigent toutefois Internet.",
    aEn: "The services list is cached on first launch, so you can view contact details even offline. The AI assistant and live searches still need an Internet connection.",
  },
  {
    q: "Comment changer la langue ?",
    qEn: "How do I switch language?",
    a: "Sur l'écran d'accueil, touchez l'icône « FR/EN » en haut à droite. Le changement est instantané et appliqué partout dans l'app.",
    aEn: "On the home screen, tap the \"FR/EN\" icon at the top right. The change is instant and applied throughout the app.",
  },
  {
    q: "Quel numéro composer en cas d'urgence ?",
    qEn: "Which number should I call in an emergency?",
    a: "En cas de danger immédiat, composez le 911. Pour une crise de santé mentale ou de détresse : 988 (24 h/24, partout au Canada). Le bouton SOS rouge en bas de l'écran rassemble toutes les lignes d'urgence.",
    aEn: "In immediate danger, call 911. For a mental-health crisis: 988 (24/7, everywhere in Canada). The red SOS button at the bottom collects every emergency line.",
  },
  {
    q: "Comment fonctionne le Diagnostic IA ?",
    qEn: "How does the AI Diagnosis work?",
    a: "Le Diagnostic IA vous pose 4 questions courtes (situation, besoin, langue, options) puis classe nos 5 300+ services selon votre profil. Aucun texte n'est envoyé à Internet : tout le calcul se fait sur votre téléphone. Si aucun résultat ne correspond, l'app vous propose directement le 211 de votre province.",
    aEn: "The AI Diagnosis asks 4 short questions (situation, need, language, filters) then ranks our 5,300+ services for you. No text leaves your phone — the matching runs locally. If nothing matches, the app sends you straight to your province's 211 line.",
  },
  {
    q: "L'app fonctionne-t-elle dans toutes les provinces ?",
    qEn: "Does the app work in every province?",
    a: "Oui — AttenteZéro couvre les 13 provinces et territoires du Canada. La couverture est la plus dense au Québec ; pour les autres régions nous fournissons les services administratifs principaux (Service Canada, service provincial, 211 local). Pour tout besoin spécifique hors Québec, l'IA et le diagnostic vous orientent vers votre 211 régional.",
    aEn: "Yes — AttenteZéro covers all 13 provinces and territories. Coverage is densest in Quebec; for other regions we provide the core administrative services (Service Canada, provincial service, local 211). For any specific need outside Quebec, the AI and diagnosis route you to your regional 211.",
  },
  {
    q: "L'assistant IA peut-il me parler dans ma langue ?",
    qEn: "Can the AI assistant speak my language?",
    a: "Oui : français, anglais, espagnol, arabe et créole haïtien. Choisissez la langue avec le drapeau en haut du chat. Vous pouvez aussi dicter votre message à la voix (icône micro) — la transcription se fait dans la langue choisie.",
    aEn: "Yes: French, English, Spanish, Arabic and Haitian Creole. Pick a language with the flag at the top of the chat. You can also dictate your message by voice (microphone icon) — transcription happens in your chosen language.",
  },
  {
    q: "Que faire si aucun service ne correspond à mes besoins ?",
    qEn: "What if no service matches my needs?",
    a: "Composez le 211 (gratuit, confidentiel, 24 h/24, dans la plupart des provinces). C'est le meilleur point de référence pour les organismes locaux non encore listés. Le diagnostic IA et l'assistant chat vous proposent automatiquement le bon numéro 211 selon votre province.",
    aEn: "Dial 211 (free, confidential, 24/7 in most provinces). It's the best entry point for local organizations not yet listed. The AI diagnosis and chat assistant automatically offer the right 211 number for your province.",
  },
  {
    q: "Comment trouver un service ouvert maintenant ?",
    qEn: "How do I find a service open right now?",
    a: "Activez le filtre « Ouvert maintenant » dans la liste des services ou à l'étape 4 du diagnostic. L'app calcule automatiquement les heures d'ouverture, fuseau horaire de votre province inclus.",
    aEn: "Turn on the \"Open now\" filter in the services list or at step 4 of the diagnosis. The app automatically computes opening hours, including your province's time zone.",
  },
  {
    q: "L'app fonctionne-t-elle pour les personnes sans-papiers ?",
    qEn: "Does the app work for undocumented people?",
    a: "Oui. Aucune création de compte n'est requise pour consulter les services. Plusieurs organismes listés (Médecins du Monde, cliniques communautaires, refuges) offrent des soins et un hébergement sans demander de statut migratoire. L'IA peut filtrer ces options spécifiquement.",
    aEn: "Yes. No account is required to browse services. Several listed organizations (Doctors of the World, community clinics, shelters) provide care and shelter without asking about immigration status. The AI can filter these options specifically.",
  },
  {
    q: "Comment changer ma province par défaut ?",
    qEn: "How do I change my default province?",
    a: "Touchez le sélecteur de province en haut de l'écran d'accueil ou du diagnostic, puis choisissez parmi les 13 provinces et territoires. Votre choix est enregistré localement et tous les résultats (services, IA, 211) sont filtrés en conséquence.",
    aEn: "Tap the province picker at the top of the home or diagnosis screen, then pick from the 13 provinces and territories. Your choice is saved locally and all results (services, AI, 211) are filtered accordingly.",
  },
];

function FaqRow({ item, isFr, colors }: { item: FaqItem; isFr: boolean; colors: ReturnType<typeof useColors> }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        setOpen((v) => !v);
      }}
      style={({ pressed }) => [
        styles.faqRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: colors.foreground }]}>
          {isFr ? item.q : item.qEn}
        </Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </View>
      {open && (
        <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>
          {isFr ? item.a : item.aEn}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
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
          {isFr ? "Aide & FAQ" : "Help & FAQ"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {isFr
            ? "Les réponses aux questions les plus fréquentes. Vous ne trouvez pas ? « Signaler un bogue » dans Plus."
            : "Answers to the most common questions. Can't find yours? Use \"Report a bug\" in More."}
        </Text>

        {FAQ.map((item, idx) => (
          <FaqRow key={idx} item={item} isFr={isFr} colors={colors} />
        ))}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/bug-report" as any);
          }}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="alert-triangle" size={16} color="#fff" />
          <Text style={styles.ctaText}>
            {isFr ? "Toujours bloqué ? Signaler un bogue" : "Still stuck? Report a bug"}
          </Text>
        </Pressable>
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
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  faqRow: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: "600" },
  faqAnswer: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  cta: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
