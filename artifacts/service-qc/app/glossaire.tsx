import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Term = {
  acronym: string;
  fullFr: string;
  fullEn: string;
  descFr: string;
  descEn: string;
  category: "fed" | "qc" | "bank" | "imm" | "santé" | "emploi";
};

const TERMS: Term[] = [
  // ─── Identifiants & numéros ───
  {
    acronym: "NAS",
    fullFr: "Numéro d'Assurance Sociale",
    fullEn: "Social Insurance Number (SIN)",
    descFr: "Numéro à 9 chiffres requis pour travailler au Canada et recevoir des prestations gouvernementales. Délivré par Service Canada.",
    descEn: "9-digit number required to work in Canada and receive government benefits. Issued by Service Canada.",
    category: "fed",
  },
  {
    acronym: "NEQ",
    fullFr: "Numéro d'Entreprise du Québec",
    fullEn: "Quebec Enterprise Number",
    descFr: "Identifiant unique attribué à toute entreprise enregistrée au Québec. Sert pour impôts, facturation et démarches officielles.",
    descEn: "Unique identifier assigned to every business registered in Quebec. Used for taxes, billing and official procedures.",
    category: "qc",
  },
  {
    acronym: "NIM",
    fullFr: "Numéro d'Inscription Médicale",
    fullEn: "Medical Registration Number",
    descFr: "Numéro figurant sur la carte RAMQ, identifiant unique pour les services de santé au Québec.",
    descEn: "Number on the RAMQ card, unique identifier for health services in Quebec.",
    category: "santé",
  },
  {
    acronym: "NIP",
    fullFr: "Numéro d'Identification Personnel",
    fullEn: "Personal Identification Number",
    descFr: "Code secret à 4 chiffres pour cartes bancaires et services en ligne.",
    descEn: "Secret 4-digit code for bank cards and online services.",
    category: "bank",
  },

  // ─── Santé ───
  {
    acronym: "RAMQ",
    fullFr: "Régie de l'Assurance Maladie du Québec",
    fullEn: "Quebec Health Insurance Board",
    descFr: "Régime public d'assurance maladie du Québec. Carte requise pour services médicaux gratuits. Délai de carence de 3 mois pour nouveaux arrivants.",
    descEn: "Quebec public health insurance plan. Card required for free medical services. 3-month waiting period for newcomers.",
    category: "santé",
  },
  {
    acronym: "CLSC",
    fullFr: "Centre Local de Services Communautaires",
    fullEn: "Local Community Services Centre",
    descFr: "Établissement de santé québécois offrant soins de première ligne gratuits : consultations, prélèvements, vaccinations, soutien psychosocial.",
    descEn: "Quebec health facility offering free front-line care: consultations, blood tests, vaccinations, psychosocial support.",
    category: "santé",
  },
  {
    acronym: "CHSLD",
    fullFr: "Centre d'Hébergement et de Soins de Longue Durée",
    fullEn: "Residential and Long-Term Care Centre",
    descFr: "Établissement public hébergeant les personnes âgées en perte d'autonomie significative.",
    descEn: "Public facility housing seniors with significant loss of autonomy.",
    category: "santé",
  },
  {
    acronym: "CISSS / CIUSSS",
    fullFr: "Centre Intégré (Universitaire) de Santé et de Services Sociaux",
    fullEn: "Integrated (University) Health and Social Services Centre",
    descFr: "Réseau régional regroupant hôpitaux, CLSC, CHSLD et services sociaux d'une région du Québec.",
    descEn: "Regional network combining hospitals, CLSCs, CHSLDs and social services of a Quebec region.",
    category: "santé",
  },
  {
    acronym: "PFSI",
    fullFr: "Programme Fédéral de Santé Intérimaire",
    fullEn: "Interim Federal Health Program (IFHP)",
    descFr: "Couverture médicale temporaire pour demandeurs d'asile, réfugiés réinstallés et personnes détenues en immigration.",
    descEn: "Temporary medical coverage for asylum seekers, resettled refugees and immigration detainees.",
    category: "santé",
  },
  {
    acronym: "GMF",
    fullFr: "Groupe de Médecine de Famille",
    fullEn: "Family Medicine Group",
    descFr: "Clinique regroupant plusieurs médecins de famille au Québec. Inscription via le GAMF (guichet d'accès à un médecin de famille).",
    descEn: "Clinic grouping several family doctors in Quebec. Registration via GAMF (family doctor access point).",
    category: "santé",
  },

  // ─── Immigration ───
  {
    acronym: "IRCC",
    fullFr: "Immigration, Réfugiés et Citoyenneté Canada",
    fullEn: "Immigration, Refugees and Citizenship Canada",
    descFr: "Ministère fédéral responsable de l'immigration, des permis de travail/études, de la résidence permanente et de la citoyenneté.",
    descEn: "Federal department responsible for immigration, work/study permits, permanent residence and citizenship.",
    category: "imm",
  },
  {
    acronym: "MIFI",
    fullFr: "Ministère de l'Immigration, de la Francisation et de l'Intégration",
    fullEn: "Quebec Ministry of Immigration, Francization and Integration",
    descFr: "Ministère du Québec en charge de l'immigration provinciale, de la francisation et de l'intégration.",
    descEn: "Quebec ministry in charge of provincial immigration, francization and integration.",
    category: "qc",
  },
  {
    acronym: "CSQ",
    fullFr: "Certificat de Sélection du Québec",
    fullEn: "Quebec Selection Certificate",
    descFr: "Document délivré par le Québec confirmant qu'une personne est sélectionnée pour immigrer dans la province. Étape provinciale avant la RP fédérale.",
    descEn: "Document issued by Quebec confirming a person is selected to immigrate to the province. Provincial step before federal PR.",
    category: "qc",
  },
  {
    acronym: "CAQ",
    fullFr: "Certificat d'Acceptation du Québec",
    fullEn: "Quebec Acceptance Certificate",
    descFr: "Autorisation requise du Québec pour étudier ou travailler temporairement dans la province.",
    descEn: "Required Quebec authorization to study or work temporarily in the province.",
    category: "qc",
  },
  {
    acronym: "RP",
    fullFr: "Résidence Permanente",
    fullEn: "Permanent Residence",
    descFr: "Statut permettant de vivre, travailler et étudier au Canada de façon permanente, sans être citoyen.",
    descEn: "Status allowing one to live, work and study in Canada permanently, without being a citizen.",
    category: "imm",
  },
  {
    acronym: "AVE",
    fullFr: "Autorisation de Voyage Électronique",
    fullEn: "Electronic Travel Authorization (eTA)",
    descFr: "Autorisation requise pour les ressortissants exemptés de visa qui voyagent au Canada par avion.",
    descEn: "Authorization required for visa-exempt nationals travelling to Canada by air.",
    category: "imm",
  },
  {
    acronym: "ASFC",
    fullFr: "Agence des Services Frontaliers du Canada",
    fullEn: "Canada Border Services Agency (CBSA)",
    descFr: "Agence fédérale responsable des frontières et des admissions au Canada.",
    descEn: "Federal agency responsible for borders and admissions to Canada.",
    category: "fed",
  },
  {
    acronym: "CISR",
    fullFr: "Commission de l'Immigration et du Statut de Réfugié",
    fullEn: "Immigration and Refugee Board (IRB)",
    descFr: "Tribunal indépendant qui décide des demandes d'asile et d'autres questions d'immigration.",
    descEn: "Independent tribunal that decides on asylum claims and other immigration matters.",
    category: "imm",
  },
  {
    acronym: "PTPD",
    fullFr: "Permis de Travail Post-Diplôme",
    fullEn: "Post-Graduation Work Permit (PGWP)",
    descFr: "Permis ouvert pour étudiants étrangers diplômés d'un établissement canadien. Durée : 8 mois à 3 ans selon le programme.",
    descEn: "Open permit for foreign students who graduated from a Canadian institution. Duration: 8 months to 3 years depending on the program.",
    category: "imm",
  },
  {
    acronym: "EIMT",
    fullFr: "Étude d'Impact sur le Marché du Travail",
    fullEn: "Labour Market Impact Assessment (LMIA)",
    descFr: "Document confirmant qu'un employeur canadien a besoin d'embaucher un travailleur étranger.",
    descEn: "Document confirming a Canadian employer needs to hire a foreign worker.",
    category: "imm",
  },

  // ─── Allocations & impôts ───
  {
    acronym: "ARC",
    fullFr: "Agence du Revenu du Canada",
    fullEn: "Canada Revenue Agency (CRA)",
    descFr: "Agence fédérale qui gère les impôts, taxes et prestations comme l'ACE et l'ACT.",
    descEn: "Federal agency managing taxes and benefits like CCB and CWB.",
    category: "fed",
  },
  {
    acronym: "ACE",
    fullFr: "Allocation Canadienne pour Enfants",
    fullEn: "Canada Child Benefit (CCB)",
    descFr: "Versement mensuel non imposable du fédéral pour familles avec enfants de moins de 18 ans. Jusqu'à 7 997 $/an par enfant <6 ans.",
    descEn: "Tax-free monthly federal payment for families with children under 18. Up to $7,997/year per child under 6.",
    category: "fed",
  },
  {
    acronym: "ACT",
    fullFr: "Allocation Canadienne pour les Travailleurs",
    fullEn: "Canada Workers Benefit (CWB)",
    descFr: "Crédit d'impôt remboursable pour travailleurs à faible revenu. Versement avancé trimestriel possible.",
    descEn: "Refundable tax credit for low-income workers. Quarterly advance payments possible.",
    category: "fed",
  },
  {
    acronym: "PSV",
    fullFr: "Pension de la Sécurité de la Vieillesse",
    fullEn: "Old Age Security (OAS)",
    descFr: "Pension mensuelle versée aux personnes de 65 ans et plus, sous conditions de résidence.",
    descEn: "Monthly pension paid to people aged 65+, subject to residency conditions.",
    category: "fed",
  },
  {
    acronym: "SRG",
    fullFr: "Supplément de Revenu Garanti",
    fullEn: "Guaranteed Income Supplement (GIS)",
    descFr: "Supplément non imposable pour aînés à faible revenu, en complément de la PSV.",
    descEn: "Tax-free supplement for low-income seniors, on top of OAS.",
    category: "fed",
  },
  {
    acronym: "RPC / QPP / RRQ",
    fullFr: "Régime de Pensions du Canada / Régime de Rentes du Québec",
    fullEn: "Canada Pension Plan / Quebec Pension Plan",
    descFr: "Régimes publics de retraite : RPC ailleurs au Canada, RRQ au Québec. Cotisations obligatoires sur le salaire.",
    descEn: "Public pension plans: CPP elsewhere in Canada, QPP in Quebec. Mandatory contributions from salary.",
    category: "fed",
  },
  {
    acronym: "RQAP",
    fullFr: "Régime Québécois d'Assurance Parentale",
    fullEn: "Quebec Parental Insurance Plan (QPIP)",
    descFr: "Régime payant des prestations à la naissance ou à l'adoption d'un enfant. Plus avantageux que le programme fédéral.",
    descEn: "Plan paying benefits at the birth or adoption of a child. More generous than the federal program.",
    category: "qc",
  },
  {
    acronym: "AE",
    fullFr: "Assurance-Emploi",
    fullEn: "Employment Insurance (EI)",
    descFr: "Programme fédéral versant des prestations en cas de perte d'emploi, maladie ou congé parental (hors QC).",
    descEn: "Federal program paying benefits in case of job loss, illness or parental leave (outside QC).",
    category: "emploi",
  },

  // ─── Travail ───
  {
    acronym: "CNESST",
    fullFr: "Commission des Normes, de l'Équité, de la Santé et de la Sécurité du Travail",
    fullEn: "Labour Standards, Pay Equity and Workplace Health and Safety Commission",
    descFr: "Organisme québécois protégeant les droits des travailleurs : salaire minimum, congés, santé/sécurité, accidents de travail.",
    descEn: "Quebec body protecting workers' rights: minimum wage, leave, health/safety, workplace accidents.",
    category: "qc",
  },
  {
    acronym: "CSST",
    fullFr: "Commission de la Santé et de la Sécurité du Travail (ancien nom)",
    fullEn: "Workplace Health and Safety Commission (former name)",
    descFr: "Ancien nom remplacé par la CNESST en 2016. Si vous voyez CSST, c'est la même chose.",
    descEn: "Former name replaced by CNESST in 2016. If you see CSST, it's the same thing.",
    category: "qc",
  },

  // ─── Études ───
  {
    acronym: "WES",
    fullFr: "World Education Services",
    fullEn: "World Education Services",
    descFr: "Organisme reconnu d'évaluation des diplômes étrangers, requis pour plusieurs démarches d'immigration et d'emploi.",
    descEn: "Recognized foreign credential evaluation body, required for several immigration and employment procedures.",
    category: "imm",
  },
  {
    acronym: "ÉCC",
    fullFr: "Évaluation Comparative des Compétences (Québec)",
    fullEn: "Comparative Evaluation of Studies (Quebec)",
    descFr: "Document du MIFI comparant un diplôme étranger avec le système québécois.",
    descEn: "MIFI document comparing a foreign diploma with the Quebec system.",
    category: "qc",
  },
  {
    acronym: "DLI",
    fullFr: "Designated Learning Institution (Établissement désigné)",
    fullEn: "Designated Learning Institution",
    descFr: "Établissement scolaire autorisé par le gouvernement à accueillir des étudiants étrangers.",
    descEn: "School authorized by the government to host international students.",
    category: "imm",
  },

  // ─── Banque & finances ───
  {
    acronym: "TVQ",
    fullFr: "Taxe de Vente du Québec",
    fullEn: "Quebec Sales Tax",
    descFr: "Taxe provinciale de 9,975 % appliquée à la majorité des biens et services au Québec.",
    descEn: "Provincial tax of 9.975% applied to most goods and services in Quebec.",
    category: "qc",
  },
  {
    acronym: "TPS / GST",
    fullFr: "Taxe sur les Produits et Services",
    fullEn: "Goods and Services Tax",
    descFr: "Taxe fédérale de 5 % appliquée à la majorité des biens et services.",
    descEn: "Federal tax of 5% applied to most goods and services.",
    category: "fed",
  },
  {
    acronym: "Crédit Solidarité",
    fullFr: "Crédit d'impôt pour solidarité",
    fullEn: "Solidarity Tax Credit",
    descFr: "Crédit québécois pour ménages à revenu modeste. Composantes TVQ, logement et village nordique.",
    descEn: "Quebec credit for low-income households. Components for QST, housing and northern villages.",
    category: "qc",
  },
  {
    acronym: "REER / RRSP",
    fullFr: "Régime Enregistré d'Épargne-Retraite",
    fullEn: "Registered Retirement Savings Plan",
    descFr: "Compte d'épargne donnant droit à une déduction fiscale. L'argent y croît à l'abri de l'impôt jusqu'au retrait.",
    descEn: "Savings account giving a tax deduction. Money grows tax-sheltered until withdrawal.",
    category: "bank",
  },
  {
    acronym: "CELI / TFSA",
    fullFr: "Compte d'Épargne Libre d'Impôt",
    fullEn: "Tax-Free Savings Account",
    descFr: "Compte d'épargne où les gains et retraits sont totalement libres d'impôt. Plafond annuel imposé.",
    descEn: "Savings account where gains and withdrawals are fully tax-free. Annual contribution limit applies.",
    category: "bank",
  },
  {
    acronym: "REEE / RESP",
    fullFr: "Régime Enregistré d'Épargne-Études",
    fullEn: "Registered Education Savings Plan",
    descFr: "Compte d'épargne pour études postsecondaires d'un enfant. Le gouvernement ajoute une subvention de 20 %.",
    descEn: "Savings account for a child's post-secondary education. Government adds a 20% grant.",
    category: "bank",
  },
  {
    acronym: "Interac",
    fullFr: "Interac (réseau de paiement)",
    fullEn: "Interac (payment network)",
    descFr: "Réseau canadien permettant les paiements directs au point de vente et les virements entre comptes (Interac e-Transfer).",
    descEn: "Canadian network for debit point-of-sale payments and account-to-account transfers (Interac e-Transfer).",
    category: "bank",
  },

  // ─── Logement ───
  {
    acronym: "TAL",
    fullFr: "Tribunal Administratif du Logement",
    fullEn: "Administrative Housing Tribunal (Quebec)",
    descFr: "Anciennement la Régie du logement. Tranche les conflits entre locataires et propriétaires au Québec.",
    descEn: "Formerly the Régie du logement. Settles disputes between tenants and landlords in Quebec.",
    category: "qc",
  },
  {
    acronym: "OMH",
    fullFr: "Office Municipal d'Habitation",
    fullEn: "Municipal Housing Office",
    descFr: "Organisme gérant les logements sociaux (HLM) d'une municipalité.",
    descEn: "Body managing social (public) housing in a municipality.",
    category: "qc",
  },
  {
    acronym: "HLM",
    fullFr: "Habitation à Loyer Modique",
    fullEn: "Public Housing",
    descFr: "Logements sociaux à loyer subventionné selon les revenus, gérés par les OMH.",
    descEn: "Public housing with rent subsidized based on income, managed by OMHs.",
    category: "qc",
  },
  {
    acronym: "CITQ",
    fullFr: "Corporation de l'Industrie Touristique du Québec",
    fullEn: "Quebec Tourism Industry Corporation",
    descFr: "Émet le numéro d'enregistrement obligatoire pour les hébergements touristiques au Québec (Airbnb, gîtes, etc.).",
    descEn: "Issues the registration number required for tourist accommodations in Quebec (Airbnb, B&Bs, etc.).",
    category: "qc",
  },

  // ─── Autres ───
  {
    acronym: "Service Canada",
    fullFr: "Service Canada",
    fullEn: "Service Canada",
    descFr: "Guichet unique fédéral pour le NAS, l'AE, la PSV, le RPC, les passeports et autres services.",
    descEn: "Federal one-stop shop for SIN, EI, OAS, CPP, passports and other services.",
    category: "fed",
  },
  {
    acronym: "SAAQ",
    fullFr: "Société de l'Assurance Automobile du Québec",
    fullEn: "Quebec Auto Insurance Board",
    descFr: "Délivre le permis de conduire et l'immatriculation au Québec. Régime public d'assurance pour blessures corporelles.",
    descEn: "Issues driver's licences and vehicle registration in Quebec. Public insurance plan for bodily injuries.",
    category: "qc",
  },
  {
    acronym: "SCHL",
    fullFr: "Société Canadienne d'Hypothèques et de Logement",
    fullEn: "Canada Mortgage and Housing Corporation (CMHC)",
    descFr: "Société d'État fédérale gérant l'assurance hypothécaire et soutenant le logement abordable.",
    descEn: "Federal Crown corporation managing mortgage insurance and supporting affordable housing.",
    category: "fed",
  },
  {
    acronym: "211 / 811 / 911",
    fullFr: "Lignes d'urgence et d'aide",
    fullEn: "Emergency and help lines",
    descFr: "211 = info services sociaux. 811 = Info-Santé / Info-Social (24/7). 911 = urgences (police, ambulance, pompiers).",
    descEn: "211 = social services info. 811 = Health Info / Social Info (24/7). 911 = emergencies (police, ambulance, fire).",
    category: "santé",
  },
];

const CATEGORY_COLORS: Record<Term["category"], { bg: string; fg: string; labelFr: string; labelEn: string }> = {
  fed: { bg: "#dbeafe", fg: "#1e40af", labelFr: "Fédéral", labelEn: "Federal" },
  qc: { bg: "#fef3c7", fg: "#92400e", labelFr: "Québec", labelEn: "Quebec" },
  bank: { bg: "#dcfce7", fg: "#15803d", labelFr: "Banque", labelEn: "Banking" },
  imm: { bg: "#ede9fe", fg: "#6d28d9", labelFr: "Immigration", labelEn: "Immigration" },
  santé: { bg: "#fee2e2", fg: "#b91c1c", labelFr: "Santé", labelEn: "Health" },
  emploi: { bg: "#cffafe", fg: "#0e7490", labelFr: "Emploi", labelEn: "Work" },
};

export default function GlossaireScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TERMS;
    return TERMS.filter((t) => {
      const haystack = [
        t.acronym,
        t.fullFr,
        t.fullEn,
        t.descFr,
        t.descEn,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#7c3aed", "#4c1d95"]}
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
              {isFr ? "Glossaire" : "Glossary"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr
                ? "Comprendre les sigles canadiens"
                : "Understand Canadian acronyms"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>📖</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.8)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isFr ? "Rechercher (NAS, RAMQ, ACE…)" : "Search (SIN, RAMQ, CCB…)"}
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {filtered.length} {isFr ? "termes" : "terms"}
        </Text>

        {filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {isFr ? "Aucun résultat" : "No results"}
            </Text>
          </View>
        ) : (
          filtered.map((t) => {
            const cat = CATEGORY_COLORS[t.category];
            return (
              <View
                key={t.acronym}
                style={[
                  styles.term,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.termHead}>
                  <Text style={[styles.termAcronym, { color: colors.foreground }]}>
                    {t.acronym}
                  </Text>
                  <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.catBadgeText, { color: cat.fg }]}>
                      {isFr ? cat.labelFr : cat.labelEn}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.termFull, { color: colors.foreground }]}>
                  {isFr ? t.fullFr : t.fullEn}
                </Text>
                <Text style={[styles.termDesc, { color: colors.mutedForeground }]}>
                  {isFr ? t.descFr : t.descEn}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 16 },
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  count: { fontSize: 12, fontWeight: "600", marginBottom: 10, marginLeft: 4 },
  empty: {
    padding: 30,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 14, fontWeight: "600" },
  term: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  termHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  termAcronym: { fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  termFull: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  termDesc: { fontSize: 13, lineHeight: 19 },
});
