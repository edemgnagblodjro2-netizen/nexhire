import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Status = {
  key: string;
  emoji: string;
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  itemsFr: string[];
  itemsEn: string[];
};

const STATUSES: Status[] = [
  {
    key: "visa",
    emoji: "🧳",
    titleFr: "Visa de visite / Touriste",
    titleEn: "Visitor visa / Tourist",
    subtitleFr: "AVE ou visa temporaire — séjour court",
    subtitleEn: "eTA or temporary visa — short stay",
    itemsFr: [
      "Garder son passeport et son autorisation d'entrée (AVE ou visa) sur soi en tout temps.",
      "Noter la date d'expiration de son séjour autorisé (tamponnée à l'entrée).",
      "Ne pas travailler ni étudier — interdit avec ce statut.",
      "Ouvrir un compte bancaire (possible avec passeport + adresse temporaire).",
      "Obtenir une assurance maladie privée — aucune couverture publique.",
      "Enregistrer son adresse auprès de son ambassade ou consulat.",
      "Explorer les options d'immigration si intention de rester (permis de travail, RQ, etc.).",
      "Ne pas dépasser la durée autorisée — risque d'interdiction de retour.",
      "Conserver tous les reçus et preuves de fonds suffisants.",
      "Contacter un conseiller en immigration si changement de statut envisagé.",
    ],
    itemsEn: [
      "Keep passport and entry authorization (eTA or visa) on you at all times.",
      "Note the expiration date of your authorized stay (stamped at entry).",
      "Do not work or study — prohibited under this status.",
      "Open a bank account (possible with passport + temporary address).",
      "Get private health insurance — no public coverage.",
      "Register your address with your embassy or consulate.",
      "Explore immigration options if you plan to stay (work permit, PR, etc.).",
      "Do not exceed authorized stay — risk of re-entry ban.",
      "Keep all receipts and proof of sufficient funds.",
      "Contact an immigration advisor if planning a status change.",
    ],
  },
  {
    key: "worker",
    emoji: "👷",
    titleFr: "Travailleur qualifié",
    titleEn: "Skilled worker",
    subtitleFr: "Permis de travail / Résidence permanente",
    subtitleEn: "Work permit / Permanent residence",
    itemsFr: [
      "Activer le dossier IRCC en ligne et confirmer l'adresse canadienne.",
      "Obtenir le NAS (Numéro d'Assurance Sociale) — Service Canada, priorité absolue dès l'arrivée.",
      "Ouvrir un compte bancaire (RBC, TD, Desjardins, BMO — prévoir passeport + NAS + preuve d'adresse).",
      "S'inscrire à la RAMQ (au Québec) — délai de carence de 3 mois, prendre une assurance privée en attendant.",
      "Obtenir un permis de conduire provincial — faire l'échange du permis étranger rapidement.",
      "Trouver un logement — bail, preuve d'adresse nécessaire pour beaucoup de démarches.",
      "Inscrire les enfants à l'école — contact avec la commission scolaire.",
      "Faire évaluer ses diplômes étrangers — WES (World Education Services) ou organisme reconnu.",
      "S'inscrire au programme d'intégration linguistique si besoin (FRANCISATION Québec — gratuit).",
      "Déclarer son arrivée à l'ARC (Agence du Revenu du Canada) — nécessaire pour crédits et prestations.",
    ],
    itemsEn: [
      "Activate IRCC online file and confirm Canadian address.",
      "Get the SIN (Social Insurance Number) — Service Canada, top priority on arrival.",
      "Open a bank account (RBC, TD, Desjardins, BMO — bring passport + SIN + proof of address).",
      "Register with RAMQ (in Quebec) — 3-month waiting period, get private insurance meanwhile.",
      "Get a provincial driver's licence — exchange foreign licence quickly.",
      "Find housing — lease, proof of address required for many procedures.",
      "Enroll children in school — contact the school board.",
      "Get foreign diplomas evaluated — WES (World Education Services) or recognized body.",
      "Register for language integration program if needed (FRANCISATION Québec — free).",
      "Declare arrival to CRA (Canada Revenue Agency) — needed for credits and benefits.",
    ],
  },
  {
    key: "student",
    emoji: "🎓",
    titleFr: "Étudiant",
    titleEn: "Student",
    subtitleFr: "Permis d'études",
    subtitleEn: "Study permit",
    itemsFr: [
      "Confirmer son inscription auprès de l'établissement dès l'arrivée.",
      "Obtenir le NAS si autorisation de travail incluse dans le permis.",
      "Ouvrir un compte bancaire étudiant — offres spéciales pour étudiants internationaux.",
      "S'inscrire au régime d'assurance maladie de l'établissement (souvent obligatoire).",
      "Obtenir la carte d'étudiant — donne accès aux ressources, bibliothèque, transports réduits.",
      "Trouver un logement — résidence universitaire ou logement privé.",
      "Vérifier les conditions de travail — maximum 20h/semaine hors campus pendant les sessions.",
      "Rejoindre les associations étudiantes — réseau, intégration, soutien.",
      "S'informer sur les voies vers la résidence permanente (PGWP, Expérience canadienne).",
      "Garder tous ses relevés de notes — essentiels pour les futures demandes d'immigration.",
    ],
    itemsEn: [
      "Confirm enrollment with the institution upon arrival.",
      "Get the SIN if work authorization is included in the permit.",
      "Open a student bank account — special offers for international students.",
      "Sign up for the institution's health insurance plan (often mandatory).",
      "Get the student card — access to resources, library, transit discounts.",
      "Find housing — university residence or private rental.",
      "Check work conditions — maximum 20h/week off-campus during sessions.",
      "Join student associations — network, integration, support.",
      "Learn about pathways to permanent residence (PGWP, Canadian Experience).",
      "Keep all transcripts — essential for future immigration applications.",
    ],
  },
  {
    key: "refugee",
    emoji: "🛡️",
    titleFr: "Réfugié (Demandeur d'asile)",
    titleEn: "Refugee (Asylum seeker)",
    subtitleFr: "Procédure d'asile au Canada",
    subtitleEn: "Asylum procedure in Canada",
    itemsFr: [
      "Déposer la demande d'asile auprès de la CISR (Commission de l'immigration et du statut de réfugié) — le plus tôt possible.",
      "Obtenir le document de demandeur d'asile — preuve de statut pour accéder aux services.",
      "Contacter un organisme d'aide aux réfugiés (ex. : PRAIDA à Montréal, COSTI à Toronto) — aide gratuite et essentielle.",
      "S'inscrire au Programme d'aide sociale en attendant le traitement du dossier.",
      "Accéder aux soins de santé via le PFSI (Programme fédéral de santé intérimaire) — couverture temporaire.",
      "Trouver un hébergement d'urgence si nécessaire — CISR ou organismes communautaires peuvent orienter.",
      "Obtenir un permis de travail ouvert — demandable après dépôt de la demande d'asile.",
      "Préparer son dossier de preuve avec un avocat en immigration (souvent gratuit via l'aide juridique).",
      "Assister à toutes les convocations de la CISR — une absence peut entraîner le rejet automatique.",
      "S'inscrire aux cours de langue (francisation ou anglais) — renforce aussi le dossier d'intégration.",
    ],
    itemsEn: [
      "File asylum claim with IRB (Immigration and Refugee Board) — as soon as possible.",
      "Get the asylum claimant document — proof of status to access services.",
      "Contact a refugee aid organization (e.g. PRAIDA Montreal, COSTI Toronto) — free and essential help.",
      "Apply for social assistance while awaiting processing.",
      "Access healthcare through IFHP (Interim Federal Health Program) — temporary coverage.",
      "Find emergency shelter if needed — IRB or community organizations can guide.",
      "Get an open work permit — available after filing the asylum claim.",
      "Prepare your evidence file with an immigration lawyer (often free via legal aid).",
      "Attend all IRB hearings — absence may lead to automatic rejection.",
      "Sign up for language classes (French or English) — also strengthens integration file.",
    ],
  },
];

export default function Top10Screen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [expanded, setExpanded] = useState<string>("visa");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[colors.primary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isFr ? "Top 10 à faire" : "Top 10 to do"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr
                ? "Priorités selon votre statut d'immigration"
                : "Priorities based on your immigration status"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {STATUSES.map((s) => {
          const open = expanded === s.key;
          const items = isFr ? s.itemsFr : s.itemsEn;
          return (
            <View
              key={s.key}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={() => setExpanded(open ? "" : s.key)}
                style={styles.cardHead}
              >
                <Text style={styles.emoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    {isFr ? s.titleFr : s.titleEn}
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: colors.mutedForeground }]}
                  >
                    {isFr ? s.subtitleFr : s.subtitleEn}
                  </Text>
                </View>
                <Feather
                  name={open ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={colors.mutedForeground}
                />
              </Pressable>

              {open && (
                <View style={styles.list}>
                  {items.map((it, idx) => (
                    <View key={idx} style={styles.item}>
                      <View
                        style={[
                          styles.num,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.numText}>{idx + 1}</Text>
                      </View>
                      <Text
                        style={[styles.itemText, { color: colors.foreground }]}
                      >
                        {it}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.footer, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {isFr
              ? "Ces listes sont indicatives. Pour un accompagnement personnalisé, contactez un organisme d'aide aux nouveaux arrivants ou un conseiller en immigration."
              : "These lists are indicative. For personalized support, contact a newcomer aid organization or immigration advisor."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  emoji: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  item: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  numText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
