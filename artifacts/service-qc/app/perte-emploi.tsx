import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Linking,
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

type Action = {
  label: string;
  url?: string;
  phone?: string;
  kind: "tel" | "url";
};

type Step = {
  emoji: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  actions?: Action[];
};

type Phase = {
  badgeFr: string;
  badgeEn: string;
  color: string;
  steps: Step[];
};

const PHASES: Phase[] = [
  {
    badgeFr: "📋 ÉTAPE 1 — Le jour même ou dans les premiers jours",
    badgeEn: "📋 STEP 1 — Same day or first few days",
    color: "#dc2626",
    steps: [
      {
        emoji: "1️⃣",
        titleFr: "Obtenir votre relevé d'emploi (RE)",
        titleEn: "Get your Record of Employment (ROE)",
        bodyFr:
          "Votre employeur doit le produire dans les 5 jours ouvrables. Il vous est envoyé par courrier ou déposé sur Mon dossier Service Canada. Sans RE, vous ne pouvez pas faire votre demande d'assurance-emploi.",
        bodyEn:
          "Your employer must issue it within 5 business days. Sent by mail or filed in My Service Canada Account. Without the ROE, you cannot apply for EI.",
        actions: [
          {
            label: "Mon dossier Service Canada",
            url: "https://www.canada.ca/fr/emploi-developpement-social/services/mon-dossier.html",
            kind: "url",
          },
        ],
      },
      {
        emoji: "2️⃣",
        titleFr: "Documenter la situation",
        titleEn: "Document the situation",
        bodyFr:
          "Garder une copie de votre lettre de congédiement ou avis de mise à pied. Noter la date officielle de fin d'emploi. Conserver tous vos talons de paie récents.",
        bodyEn:
          "Keep a copy of your termination letter or layoff notice. Note the official end-of-employment date. Keep all recent pay stubs.",
      },
    ],
  },
  {
    badgeFr: "📋 ÉTAPE 2 — Dans les 4 premières semaines (PRIORITÉ ABSOLUE)",
    badgeEn: "📋 STEP 2 — Within 4 weeks (TOP PRIORITY)",
    color: "#ea580c",
    steps: [
      {
        emoji: "3️⃣",
        titleFr: "Faire une demande d'assurance-emploi (AE)",
        titleEn: "File an Employment Insurance (EI) claim",
        bodyFr:
          "À faire dans les 4 semaines suivant la perte d'emploi — après, vous perdez des semaines de prestations. En ligne sur canada.ca/assurance-emploi. Avoir en main : NAS, RE, coordonnées bancaires, historique d'emploi des 52 dernières semaines. Délai de carence : 1 semaine sans prestation au début. Montant : environ 55 % de votre salaire brut, jusqu'à un maximum de ~695 $/semaine (2026).",
        bodyEn:
          "Apply within 4 weeks of job loss — otherwise you lose weeks of benefits. Online at canada.ca/ei. Have ready: SIN, ROE, banking info, 52-week employment history. 1-week unpaid waiting period. Amount: about 55% of gross salary, max ~$695/week (2026).",
        actions: [
          {
            label: "Demander l'AE en ligne",
            url: "https://www.canada.ca/fr/services/prestations/ae.html",
            kind: "url",
          },
          {
            label: "1-800-808-6352 (AE)",
            phone: "1-800-808-6352",
            kind: "tel",
          },
        ],
      },
      {
        emoji: "4️⃣",
        titleFr: "S'inscrire à Emploi-Québec",
        titleEn: "Register with Emploi-Québec",
        bodyFr:
          "Sur quebec.ca → Emploi → Services aux chercheurs d'emploi. Donne accès à des formations, subventions et accompagnement gratuit. Votre agent peut vous aider à mettre à jour votre CV et préparer vos entretiens.",
        bodyEn:
          "On quebec.ca → Employment → Job-seeker services. Free access to training, grants and coaching. Your agent can help update your CV and prepare interviews.",
        actions: [
          {
            label: "Emploi-Québec",
            url: "https://www.quebec.ca/emploi",
            kind: "url",
          },
        ],
      },
    ],
  },
  {
    badgeFr: "📋 ÉTAPE 3 — Dans le premier mois",
    badgeEn: "📋 STEP 3 — Within the first month",
    color: "#ca8a04",
    steps: [
      {
        emoji: "5️⃣",
        titleFr: "Vérifier vos droits avec votre employeur",
        titleEn: "Check your rights with your employer",
        bodyFr:
          "Indemnité de départ — selon votre ancienneté et votre contrat. Vacances non prises — doivent être remboursées. Assurances collectives — vérifier jusqu'à quelle date vous êtes couvert. En cas de doute : contacter la CNESST (Commission des normes, de l'équité, de la santé et de la sécurité du travail) — gratuit.",
        bodyEn:
          "Severance pay — based on seniority and contract. Unused vacation — must be paid out. Group insurance — check coverage end date. In doubt: contact CNESST (free).",
        actions: [
          {
            label: "CNESST 1-844-838-0808",
            phone: "1-844-838-0808",
            kind: "tel",
          },
          {
            label: "cnesst.gouv.qc.ca",
            url: "https://www.cnesst.gouv.qc.ca",
            kind: "url",
          },
        ],
      },
      {
        emoji: "6️⃣",
        titleFr: "Aviser la RAMQ si nécessaire",
        titleEn: "Notify RAMQ if needed",
        bodyFr:
          "Si vous perdiez votre assurance médicaments via l'employeur, vous devez vous inscrire au régime public de la RAMQ dans les 60 jours. Sans action dans ce délai, vous devrez payer une pénalité.",
        bodyEn:
          "If you lose employer drug insurance, you must enrol in RAMQ's public plan within 60 days, or you'll pay a penalty.",
        actions: [
          {
            label: "RAMQ 1-800-561-9749",
            phone: "1-800-561-9749",
            kind: "tel",
          },
          {
            label: "ramq.gouv.qc.ca",
            url: "https://www.ramq.gouv.qc.ca",
            kind: "url",
          },
        ],
      },
      {
        emoji: "7️⃣",
        titleFr: "Revoir votre budget",
        titleEn: "Review your budget",
        bodyFr:
          "Identifier les dépenses à réduire immédiatement. Contacter votre banque si vous avez un prêt hypothécaire — options de report de paiement possibles. Vérifier si vous avez droit au crédit pour TPS/TVH et à l'Allocation canadienne pour les travailleurs.",
        bodyEn:
          "Identify expenses to cut now. Contact your bank if you have a mortgage — payment deferrals may be available. Check eligibility for GST/HST credit and the Canada Workers Benefit.",
      },
    ],
  },
  {
    badgeFr: "📋 ÉTAPE 4 — Selon votre situation personnelle",
    badgeEn: "📋 STEP 4 — Depending on your situation",
    color: "#16a34a",
    steps: [
      {
        emoji: "8️⃣",
        titleFr: "Aide sociale (si AE insuffisante ou refusée)",
        titleEn: "Social assistance (if EI insufficient or denied)",
        bodyFr:
          "Programme de Solidarité sociale ou Aide sociale via le MTESS. En ligne sur quebec.ca ou au bureau local du ministère. À considérer si l'AE est refusée (ex. : démission volontaire) ou insuffisante.",
        bodyEn:
          "Social Solidarity Program or Social Assistance via MTESS. Online at quebec.ca or local ministry office. Consider if EI is denied (e.g. voluntary resignation) or too low.",
        actions: [
          {
            label: "MTESS — Aide sociale",
            url: "https://www.quebec.ca/famille-et-soutien-aux-personnes/aide-sociale-et-solidarite-sociale",
            kind: "url",
          },
        ],
      },
      {
        emoji: "9️⃣",
        titleFr: "Formation et reconversion",
        titleEn: "Training and career change",
        bodyFr:
          "Emploi-Québec offre des subventions de formation pouvant couvrir jusqu'à 100 % des frais. Programme Objectif emploi pour les nouveaux demandeurs d'aide sociale. Entente d'aide au développement des compétences (EADC) — formation pendant l'AE.",
        bodyEn:
          "Emploi-Québec offers training grants up to 100% of fees. Programme Objectif emploi for new social-assistance applicants. Skills Development Agreement (EADC) — training while on EI.",
      },
      {
        emoji: "🔟",
        titleFr: "Chercher activement un emploi",
        titleEn: "Actively look for work",
        bodyFr:
          "Mettre à jour CV et LinkedIn immédiatement. S'inscrire sur Jobillico, Guichet-Emplois (canada.ca), Indeed, LinkedIn. Activer le réseau professionnel — 70 % des emplois ne sont pas affichés. Contacter des agences (Adecco, Randstad, Manpower).",
        bodyEn:
          "Update CV and LinkedIn now. Sign up on Jobillico, Job Bank (canada.ca), Indeed, LinkedIn. Activate your network — 70% of jobs are unposted. Contact agencies (Adecco, Randstad, Manpower).",
        actions: [
          {
            label: "Guichet-Emplois Canada",
            url: "https://www.guichetemplois.gc.ca",
            kind: "url",
          },
          {
            label: "Jobillico",
            url: "https://www.jobillico.com",
            kind: "url",
          },
        ],
      },
    ],
  },
];

const KEY_RESOURCES: { labelFr: string; labelEn: string; phone?: string; url?: string }[] = [
  {
    labelFr: "Assurance-emploi (AE)",
    labelEn: "Employment Insurance (EI)",
    phone: "1-800-808-6352",
    url: "https://www.canada.ca/fr/services/prestations/ae.html",
  },
  {
    labelFr: "Service Canada (général)",
    labelEn: "Service Canada (general)",
    phone: "1-800-622-6232",
    url: "https://www.canada.ca/fr/emploi-developpement-social/ministere/portefeuille/service-canada.html",
  },
  {
    labelFr: "CNESST — droits des travailleurs",
    labelEn: "CNESST — workers' rights",
    phone: "1-844-838-0808",
    url: "https://www.cnesst.gouv.qc.ca",
  },
  {
    labelFr: "Emploi-Québec",
    labelEn: "Emploi-Québec",
    url: "https://www.quebec.ca/emploi",
  },
  {
    labelFr: "RAMQ — assurance médicaments",
    labelEn: "RAMQ — drug insurance",
    phone: "1-800-561-9749",
    url: "https://www.ramq.gouv.qc.ca",
  },
];

export default function PerteEmploiScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const handleAction = (a: Action) => {
    if (a.kind === "tel" && a.phone) {
      Linking.openURL(`tel:${a.phone.replace(/[^0-9+]/g, "")}`);
    } else if (a.kind === "url" && a.url) {
      Linking.openURL(a.url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#1e40af", "#1e3a8a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isFr ? "Perte d'emploi" : "Job loss"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr ? "Les étapes à suivre, dans l'ordre" : "Steps to follow, in order"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>💼</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bandeau d'urgence */}
        <View
          style={[
            styles.tip,
            { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
          ]}
        >
          <Text style={{ fontSize: 22 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: "#7f1d1d" }]}>
              {isFr ? "Délai critique : 4 semaines" : "Critical deadline: 4 weeks"}
            </Text>
            <Text style={[styles.tipText, { color: "#7f1d1d" }]}>
              {isFr
                ? "Demandez votre AE dans les 4 semaines suivant la perte d'emploi. Après, vous perdez des semaines de prestations."
                : "Apply for EI within 4 weeks of job loss. After that, you lose weeks of benefits."}
            </Text>
          </View>
        </View>

        {/* Phases */}
        {PHASES.map((phase) => (
          <View key={phase.badgeFr} style={{ marginBottom: 24 }}>
            <View
              style={[
                styles.phaseBadge,
                { backgroundColor: phase.color },
              ]}
            >
              <Text style={styles.phaseBadgeText}>
                {isFr ? phase.badgeFr : phase.badgeEn}
              </Text>
            </View>

            {phase.steps.map((step) => (
              <View
                key={step.titleFr}
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: phase.color,
                  },
                ]}
              >
                <View style={styles.stepHeaderRow}>
                  <Text style={styles.stepEmoji}>{step.emoji}</Text>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    {isFr ? step.titleFr : step.titleEn}
                  </Text>
                </View>
                <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>
                  {isFr ? step.bodyFr : step.bodyEn}
                </Text>
                {step.actions && step.actions.length > 0 && (
                  <View style={styles.actionsRow}>
                    {step.actions.map((a) => (
                      <Pressable
                        key={a.label}
                        onPress={() => handleAction(a)}
                        style={({ pressed }) => [
                          a.kind === "tel" ? styles.actionBtnTel : styles.actionBtnUrl,
                          {
                            backgroundColor:
                              a.kind === "tel" ? phase.color : "transparent",
                            borderColor: phase.color,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Feather
                          name={a.kind === "tel" ? "phone" : "external-link"}
                          size={13}
                          color={a.kind === "tel" ? "#fff" : phase.color}
                        />
                        <Text
                          style={[
                            styles.actionBtnText,
                            { color: a.kind === "tel" ? "#fff" : phase.color },
                          ]}
                        >
                          {a.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Tableau récap */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "⏰ Délais à retenir" : "⏰ Key deadlines"}
        </Text>
        <View
          style={[
            styles.recapBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {[
            {
              fr: "Immédiat",
              en: "Immediate",
              actFr: "Demander le relevé d'emploi (RE)",
              actEn: "Request the Record of Employment (ROE)",
            },
            {
              fr: "Dans 4 semaines",
              en: "Within 4 weeks",
              actFr: "Faire la demande d'AE",
              actEn: "Apply for EI",
            },
            {
              fr: "Dans 60 jours",
              en: "Within 60 days",
              actFr: "S'inscrire à la RAMQ (médicaments)",
              actEn: "Enrol in RAMQ (drug plan)",
            },
            {
              fr: "En continu",
              en: "Ongoing",
              actFr: "Déclarer ses revenus à l'AE chaque 2 semaines",
              actEn: "Report income to EI every 2 weeks",
            },
          ].map((row) => (
            <View key={row.fr} style={styles.recapRow}>
              <Text style={[styles.recapDelay, { color: colors.foreground }]}>
                {isFr ? row.fr : row.en}
              </Text>
              <Text style={[styles.recapAction, { color: colors.mutedForeground }]}>
                {isFr ? row.actFr : row.actEn}
              </Text>
            </View>
          ))}
        </View>

        {/* Ressources clés */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 18 }]}>
          {isFr ? "📞 Ressources clés" : "📞 Key resources"}
        </Text>
        {KEY_RESOURCES.map((r) => (
          <View
            key={r.labelFr}
            style={[
              styles.resCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.resLabel, { color: colors.foreground }]}>
              {isFr ? r.labelFr : r.labelEn}
            </Text>
            <View style={styles.resActions}>
              {r.phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${r.phone!.replace(/[^0-9+]/g, "")}`)}
                  style={({ pressed }) => [
                    styles.resBtn,
                    { backgroundColor: "#1e40af", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="phone" size={13} color="#fff" />
                  <Text style={styles.resBtnText}>{r.phone}</Text>
                </Pressable>
              )}
              {r.url && (
                <Pressable
                  onPress={() => Linking.openURL(r.url!)}
                  style={({ pressed }) => [
                    styles.resBtnOutline,
                    { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="external-link" size={13} color={colors.foreground} />
                  <Text style={[styles.resBtnOutlineText, { color: colors.foreground }]}>
                    {isFr ? "Site web" : "Website"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          {isFr
            ? "ℹ️ Ce guide est à titre informatif. Les montants et délais peuvent varier. Consultez toujours les sites officiels (canada.ca, quebec.ca) pour les chiffres à jour."
            : "ℹ️ This guide is informational. Amounts and deadlines may vary. Always check official sites (canada.ca, quebec.ca) for current figures."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 18, paddingHorizontal: 16 },
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
  headerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tip: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 18,
  },
  tipTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
  phaseBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  phaseBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  stepCard: {
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  stepEmoji: { fontSize: 18 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
  stepBody: { fontSize: 13, lineHeight: 19 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionBtnTel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnUrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  recapBox: { borderWidth: 1, borderRadius: 12, padding: 4 },
  recapRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  recapDelay: { width: 110, fontSize: 13, fontWeight: "700" },
  recapAction: { flex: 1, fontSize: 13, lineHeight: 18 },
  resCard: { padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  resLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  resActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  resBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  resBtnOutlineText: { fontSize: 13, fontWeight: "600" },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
