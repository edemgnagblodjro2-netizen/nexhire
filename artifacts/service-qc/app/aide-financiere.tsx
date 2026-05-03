import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Linking,
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

type Statut = "rp" | "citoyen" | "travailleur" | "etudiant" | "asile" | "visiteur";

type Form = {
  statut: Statut;
  enfantsMoins6: number;
  enfants6a17: number;
  revenu: number;
  monoparental: boolean;
  age65plus: boolean;
  travaille: boolean;
};

type Aide = {
  key: string;
  nameFr: string;
  nameEn: string;
  level: "fed" | "qc";
  amount: number;
  eligible: boolean;
  noteFr: string;
  noteEn: string;
  url: string;
};

// ─────────────────────────────────────────────────────────
// Estimations basées sur les barèmes 2025-2026 (sources officielles : ARC,
// Revenu Québec, Retraite Québec). Chiffres simplifiés à des fins
// d'estimation — toujours confirmer avec les services officiels.
// ─────────────────────────────────────────────────────────

function calcACE(f: Form): { amt: number; eligible: boolean } {
  // Doit être résident canadien (RP, citoyen, asile accepté, certains permis 18+ mois)
  const eligible = ["rp", "citoyen", "asile"].includes(f.statut);
  if (!eligible) return { amt: 0, eligible: false };

  const baseM6 = 7997; // par enfant <6 ans
  const base6a17 = 6748; // par enfant 6-17 ans
  let total = f.enfantsMoins6 * baseM6 + f.enfants6a17 * base6a17;

  // Réduction au-dessus de 36 502 $
  const seuil = 36502;
  const nbEnfants = f.enfantsMoins6 + f.enfants6a17;
  if (nbEnfants > 0 && f.revenu > seuil) {
    const exces = f.revenu - seuil;
    let taux = 0;
    if (nbEnfants === 1) taux = 0.07;
    else if (nbEnfants === 2) taux = 0.135;
    else if (nbEnfants === 3) taux = 0.19;
    else taux = 0.23;
    total = Math.max(0, total - exces * taux);
  }
  return { amt: Math.round(total), eligible: nbEnfants > 0 };
}

function calcAllocFamilleQC(f: Form): { amt: number; eligible: boolean } {
  const eligible = ["rp", "citoyen", "asile"].includes(f.statut);
  if (!eligible) return { amt: 0, eligible: false };

  const nb = f.enfantsMoins6 + f.enfants6a17;
  if (nb === 0) return { amt: 0, eligible: false };

  // Montant max approx 2025 : 2 923 $ premier enfant + 1 461 $ par enfant additionnel
  let total = 2923 + Math.max(0, nb - 1) * 1461;
  if (f.monoparental) total += 1024; // supplément mono

  // Réduction couple ~57 822 $, mono ~52 358 $
  const seuil = f.monoparental ? 52358 : 57822;
  if (f.revenu > seuil) {
    total = Math.max(1196, total - (f.revenu - seuil) * 0.04);
  }
  return { amt: Math.round(total), eligible: true };
}

function calcCreditSolidarite(f: Form): { amt: number; eligible: boolean } {
  // Composantes : TVQ + logement (+ Nord si applicable). Montant estimé pour
  // un ménage type au QC, hors région nordique.
  const eligible = ["rp", "citoyen", "asile", "travailleur", "etudiant"].includes(f.statut);
  if (!eligible) return { amt: 0, eligible: false };
  const base = f.monoparental || f.enfantsMoins6 + f.enfants6a17 > 0 ? 1450 : 1100;
  const seuil = 39160;
  let amt = base;
  if (f.revenu > seuil) {
    amt = Math.max(0, base - (f.revenu - seuil) * 0.06);
  }
  return { amt: Math.round(amt), eligible: amt > 0 };
}

function calcACT(f: Form): { amt: number; eligible: boolean } {
  // Allocation canadienne pour les travailleurs (ACT) — montant fédéral
  if (!f.travaille) return { amt: 0, eligible: false };
  const eligible = ["rp", "citoyen", "asile", "travailleur"].includes(f.statut);
  if (!eligible) return { amt: 0, eligible: false };

  const isFamily = f.monoparental || f.enfantsMoins6 + f.enfants6a17 > 0;
  const max = isFamily ? 2813 : 1633;
  // S'applique au revenu de travail entre ~3 000 $ et ~26 000 $ (single) /
  // 29 000 $ (family). Diminue ensuite.
  if (f.revenu < 3000) return { amt: 0, eligible: true };
  const plateau = isFamily ? 17800 : 13500;
  const seuilSortie = isFamily ? 29833 : 26149;
  let amt = max;
  if (f.revenu < plateau) {
    amt = ((f.revenu - 3000) / (plateau - 3000)) * max;
  } else if (f.revenu > seuilSortie) {
    const sortie = isFamily ? 49389 : 36749;
    if (f.revenu > sortie) amt = 0;
    else amt = max * (1 - (f.revenu - seuilSortie) / (sortie - seuilSortie));
  }
  return { amt: Math.round(Math.max(0, amt)), eligible: true };
}

function calcSRG(f: Form): { amt: number; eligible: boolean } {
  if (!f.age65plus) return { amt: 0, eligible: false };
  if (!["rp", "citoyen"].includes(f.statut)) return { amt: 0, eligible: false };
  // SRG max approx 12 800 $/an pour pensionné seul à faible revenu
  const max = 12800;
  let amt = max;
  if (f.revenu > 22056) amt = Math.max(0, max - (f.revenu - 22056) * 0.5);
  return { amt: Math.round(amt), eligible: true };
}

function calcPSV(f: Form): { amt: number; eligible: boolean } {
  if (!f.age65plus) return { amt: 0, eligible: false };
  if (!["rp", "citoyen"].includes(f.statut)) return { amt: 0, eligible: false };
  const max = 8763; // approx 730 $/mois
  return { amt: max, eligible: true };
}

function calcRQAP(f: Form): { amt: number; eligible: boolean } {
  // Pas calculé, juste signalé comme info si jeune travailleur avec enfants
  if (f.enfantsMoins6 === 0) return { amt: 0, eligible: false };
  if (!f.travaille) return { amt: 0, eligible: false };
  const eligible = ["rp", "citoyen", "asile", "travailleur"].includes(f.statut);
  if (!eligible) return { amt: 0, eligible: false };
  return { amt: 0, eligible: true };
}

function computeAides(f: Form): Aide[] {
  const ace = calcACE(f);
  const af = calcAllocFamilleQC(f);
  const sol = calcCreditSolidarite(f);
  const act = calcACT(f);
  const srg = calcSRG(f);
  const psv = calcPSV(f);
  const rqap = calcRQAP(f);

  return [
    {
      key: "ace",
      nameFr: "Allocation canadienne pour enfants (ACE)",
      nameEn: "Canada Child Benefit (CCB)",
      level: "fed",
      amount: ace.amt,
      eligible: ace.eligible,
      noteFr: "Versement mensuel non imposable. Demande via l'ARC dès l'arrivée.",
      noteEn: "Tax-free monthly payment. Apply via CRA upon arrival.",
      url: "https://www.canada.ca/fr/agence-revenu/services/prestations-enfants-familles/allocation-canadienne-enfants-apercu.html",
    },
    {
      key: "af",
      nameFr: "Allocation famille du Québec",
      nameEn: "Quebec Family Allowance",
      level: "qc",
      amount: af.amt,
      eligible: af.eligible,
      noteFr: "Versée par Retraite Québec. Inscription automatique à la naissance.",
      noteEn: "Paid by Retraite Québec. Automatic enrollment at birth.",
      url: "https://www.rrq.gouv.qc.ca/fr/programmes/soutien_enfants/paiement/Pages/paiement.aspx",
    },
    {
      key: "sol",
      nameFr: "Crédit d'impôt pour solidarité (QC)",
      nameEn: "Solidarity Tax Credit (QC)",
      level: "qc",
      amount: sol.amt,
      eligible: sol.eligible,
      noteFr: "Composantes TVQ et logement. Demande via la déclaration de revenus.",
      noteEn: "QST and housing components. Claimed via tax return.",
      url: "https://www.revenuquebec.ca/fr/citoyens/credits-dimpot/credit-dimpot-pour-solidarite/",
    },
    {
      key: "act",
      nameFr: "Allocation canadienne pour les travailleurs (ACT)",
      nameEn: "Canada Workers Benefit (CWB)",
      level: "fed",
      amount: act.amt,
      eligible: act.eligible,
      noteFr: "Crédit remboursable pour travailleurs à faible revenu. Avances trimestrielles possibles.",
      noteEn: "Refundable credit for low-income workers. Quarterly advances available.",
      url: "https://www.canada.ca/fr/agence-revenu/services/prestations-enfants-familles/allocation-canadienne-travailleurs.html",
    },
    {
      key: "srg",
      nameFr: "Supplément de revenu garanti (SRG)",
      nameEn: "Guaranteed Income Supplement (GIS)",
      level: "fed",
      amount: srg.amt,
      eligible: srg.eligible,
      noteFr: "Pour aînés à faible revenu, en plus de la PSV. Demande via Service Canada.",
      noteEn: "For low-income seniors, in addition to OAS. Apply via Service Canada.",
      url: "https://www.canada.ca/fr/services/prestations/pensionspubliques/rpc/securite-vieillesse/supplement-revenu-garanti.html",
    },
    {
      key: "psv",
      nameFr: "Pension de la Sécurité de la vieillesse (PSV)",
      nameEn: "Old Age Security (OAS)",
      level: "fed",
      amount: psv.amt,
      eligible: psv.eligible,
      noteFr: "Pension mensuelle dès 65 ans. Inscription automatique pour la plupart.",
      noteEn: "Monthly pension from age 65. Automatic enrollment for most.",
      url: "https://www.canada.ca/fr/services/prestations/pensionspubliques/rpc/securite-vieillesse.html",
    },
    {
      key: "rqap",
      nameFr: "Régime québécois d'assurance parentale (RQAP)",
      nameEn: "Quebec Parental Insurance Plan (QPIP)",
      level: "qc",
      amount: rqap.amt,
      eligible: rqap.eligible,
      noteFr: "Prestations à la naissance/adoption. Vérifiez le calculateur officiel pour le montant.",
      noteEn: "Birth/adoption benefits. Check the official calculator for the amount.",
      url: "https://www.rqap.gouv.qc.ca/fr",
    },
  ];
}

const STATUTS: { key: Statut; labelFr: string; labelEn: string; emoji: string }[] = [
  { key: "rp", labelFr: "Résident permanent", labelEn: "Permanent resident", emoji: "🟢" },
  { key: "citoyen", labelFr: "Citoyen canadien", labelEn: "Canadian citizen", emoji: "🍁" },
  { key: "travailleur", labelFr: "Permis de travail", labelEn: "Work permit", emoji: "👷" },
  { key: "etudiant", labelFr: "Permis d'études", labelEn: "Study permit", emoji: "🎓" },
  { key: "asile", labelFr: "Demandeur d'asile", labelEn: "Asylum seeker", emoji: "🕊️" },
  { key: "visiteur", labelFr: "Visiteur / Touriste", labelEn: "Visitor / Tourist", emoji: "🧳" },
];

export default function AideFinanciereScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [form, setForm] = useState<Form>({
    statut: "rp",
    enfantsMoins6: 0,
    enfants6a17: 0,
    revenu: 35000,
    monoparental: false,
    age65plus: false,
    travaille: true,
  });
  const [calculated, setCalculated] = useState(false);

  const aides = useMemo(() => computeAides(form), [form]);
  const totalEligible = aides
    .filter((a) => a.eligible && a.amount > 0)
    .reduce((s, a) => s + a.amount, 0);

  const setField = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setCalculated(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#16a34a", "#14532d"]}
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
              {isFr ? "Aide financière" : "Financial aid"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr ? "Estimateur d'aides gouvernementales" : "Government benefits estimator"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>💰</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isFr
              ? "Répondez à quelques questions pour estimer les aides du gouvernement (Canada + Québec) auxquelles vous pourriez avoir droit."
              : "Answer a few questions to estimate the government benefits (Canada + Quebec) you may qualify for."}
          </Text>
        </View>

        {/* Statut */}
        <Text style={[styles.label, { color: colors.foreground }]}>
          {isFr ? "Votre statut" : "Your status"}
        </Text>
        <View style={styles.chipRow}>
          {STATUTS.map((s) => {
            const active = form.statut === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setField("statut", s.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? "#16a34a" : colors.card,
                    borderColor: active ? "#16a34a" : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{s.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? "#fff" : colors.foreground },
                  ]}
                >
                  {isFr ? s.labelFr : s.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Enfants */}
        <Text style={[styles.label, { color: colors.foreground }]}>
          {isFr ? "Enfants" : "Children"}
        </Text>
        <View style={styles.row2}>
          <Counter
            label={isFr ? "Moins de 6 ans" : "Under 6"}
            value={form.enfantsMoins6}
            onChange={(v) => setField("enfantsMoins6", v)}
            colors={colors}
          />
          <Counter
            label={isFr ? "6 à 17 ans" : "6 to 17"}
            value={form.enfants6a17}
            onChange={(v) => setField("enfants6a17", v)}
            colors={colors}
          />
        </View>

        {/* Revenu */}
        <Text style={[styles.label, { color: colors.foreground }]}>
          {isFr ? "Revenu annuel du ménage" : "Household annual income"}
        </Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.dollar, { color: colors.mutedForeground }]}>$</Text>
          <TextInput
            value={String(form.revenu)}
            onChangeText={(t) => setField("revenu", parseInt(t.replace(/[^0-9]/g, ""), 10) || 0)}
            keyboardType="numeric"
            style={[styles.input, { color: colors.foreground }]}
            placeholder="35000"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={[styles.suffix, { color: colors.mutedForeground }]}>
            {isFr ? "/an" : "/yr"}
          </Text>
        </View>

        {/* Toggles */}
        <View style={styles.toggleBlock}>
          <Toggle
            label={isFr ? "Famille monoparentale" : "Single-parent family"}
            value={form.monoparental}
            onChange={(v) => setField("monoparental", v)}
            colors={colors}
          />
          <Toggle
            label={isFr ? "65 ans ou plus" : "65 years or older"}
            value={form.age65plus}
            onChange={(v) => setField("age65plus", v)}
            colors={colors}
          />
          <Toggle
            label={isFr ? "Vous travaillez (revenu d'emploi)" : "You work (employment income)"}
            value={form.travaille}
            onChange={(v) => setField("travaille", v)}
            colors={colors}
          />
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => setCalculated(true)}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: "#16a34a", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="dollar-sign" size={18} color="#fff" />
          <Text style={styles.ctaText}>
            {isFr ? "Calculer mes aides" : "Calculate my benefits"}
          </Text>
        </Pressable>

        {calculated && (
          <View style={styles.resultsBlock}>
            <View
              style={[
                styles.totalCard,
                { backgroundColor: "#dcfce7", borderColor: "#86efac" },
              ]}
            >
              <Text style={[styles.totalLabel, { color: "#14532d" }]}>
                {isFr ? "Total estimé" : "Estimated total"}
              </Text>
              <Text style={[styles.totalValue, { color: "#166534" }]}>
                ~ {totalEligible.toLocaleString(isFr ? "fr-CA" : "en-CA")} $/{isFr ? "an" : "yr"}
              </Text>
              <Text style={[styles.totalSub, { color: "#166534" }]}>
                {isFr
                  ? "Estimation indicative — confirmer avec les services officiels"
                  : "Indicative estimate — confirm with official services"}
              </Text>
            </View>

            {aides.map((a) => (
              <View
                key={a.key}
                style={[
                  styles.aide,
                  {
                    backgroundColor: colors.card,
                    borderColor: a.eligible && a.amount > 0 ? "#86efac" : colors.border,
                    opacity: a.eligible ? 1 : 0.55,
                  },
                ]}
              >
                <View style={styles.aideHead}>
                  <View
                    style={[
                      styles.aideBadge,
                      { backgroundColor: a.level === "fed" ? "#dbeafe" : "#fef3c7" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aideBadgeText,
                        { color: a.level === "fed" ? "#1e40af" : "#92400e" },
                      ]}
                    >
                      {a.level === "fed" ? (isFr ? "FÉD" : "FED") : "QC"}
                    </Text>
                  </View>
                  <Text style={[styles.aideName, { color: colors.foreground }]}>
                    {isFr ? a.nameFr : a.nameEn}
                  </Text>
                </View>

                {a.eligible && a.amount > 0 ? (
                  <Text style={[styles.aideAmt, { color: "#16a34a" }]}>
                    ~ {a.amount.toLocaleString(isFr ? "fr-CA" : "en-CA")} $/{isFr ? "an" : "yr"}
                  </Text>
                ) : a.eligible ? (
                  <Text style={[styles.aideAmt, { color: "#f59e0b" }]}>
                    {isFr ? "Admissible — vérifier le montant" : "Eligible — check amount"}
                  </Text>
                ) : (
                  <Text style={[styles.aideAmt, { color: colors.mutedForeground }]}>
                    {isFr ? "Non admissible" : "Not eligible"}
                  </Text>
                )}

                <Text style={[styles.aideNote, { color: colors.mutedForeground }]}>
                  {isFr ? a.noteFr : a.noteEn}
                </Text>

                <Pressable
                  onPress={() => Linking.openURL(a.url)}
                  style={({ pressed }) => [
                    styles.aideLink,
                    { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="external-link" size={12} color={colors.foreground} />
                  <Text style={[styles.aideLinkText, { color: colors.foreground }]}>
                    {isFr ? "Site officiel" : "Official site"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          {isFr
            ? "⚠️ Estimation à titre indicatif uniquement, basée sur les barèmes 2025-2026. Les montants exacts dépendent de votre déclaration de revenus complète. Confirmez toujours auprès de l'ARC, Revenu Québec et Service Canada."
            : "⚠️ Indicative estimate only, based on 2025-2026 rates. Exact amounts depend on your complete tax return. Always confirm with CRA, Revenu Québec and Service Canada."}
        </Text>
      </ScrollView>
    </View>
  );
}

function Counter({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.counterLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.counterRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          style={[styles.counterBtn, { borderColor: colors.border }]}
        >
          <Feather name="minus" size={16} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.counterValue, { color: colors.foreground }]}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(10, value + 1))}
          style={[styles.counterBtn, { borderColor: colors.border }]}
        >
          <Feather name="plus" size={16} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.toggleSwitch,
          { backgroundColor: value ? "#16a34a" : colors.border },
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            { transform: [{ translateX: value ? 18 : 2 }] },
          ]}
        />
      </View>
    </Pressable>
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
  intro: { padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 16 },
  introText: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  row2: { flexDirection: "row", gap: 10, marginBottom: 14 },
  counter: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  counterLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: { fontSize: 18, fontWeight: "800" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  dollar: { fontSize: 18, fontWeight: "700", marginRight: 6 },
  input: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: "700" },
  suffix: { fontSize: 14, marginLeft: 6 },
  toggleBlock: { gap: 8, marginBottom: 16 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  toggleSwitch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultsBlock: { marginTop: 4 },
  totalCard: {
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: { fontSize: 13, fontWeight: "700" },
  totalValue: { fontSize: 28, fontWeight: "900", marginVertical: 4 },
  totalSub: { fontSize: 11, fontStyle: "italic" },
  aide: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  aideHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  aideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aideBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  aideName: { flex: 1, fontSize: 13, fontWeight: "700" },
  aideAmt: { fontSize: 16, fontWeight: "800", marginVertical: 4 },
  aideNote: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  aideLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  aideLinkText: { fontSize: 11, fontWeight: "600" },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12 },
});
