import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
      "Confirmer son inscription auprès du Designated Learning Institution (DLI).",
      "Obtenir le NAS si on travaille (jusqu'à 24 h/semaine hors campus autorisé).",
      "Ouvrir un compte bancaire étudiant (souvent gratuit dans les grandes banques).",
      "Souscrire à l'assurance maladie de l'établissement (RAMQ ne couvre pas la majorité des étudiants étrangers).",
      "Obtenir une carte étudiante — donne accès à de nombreux rabais.",
      "Trouver un logement étudiant ou en colocation — résidence universitaire ou bail privé.",
      "Acheter une carte de transport (OPUS au Québec, PRESTO en Ontario).",
      "Connaître les règles d'emploi : 24 h/sem hors campus pendant les sessions, temps plein durant les pauses.",
      "Garder les preuves d'inscription et de paiement des droits — utiles pour le PTPD à la fin.",
      "Préparer le permis de travail post-diplôme (PTPD) avant la fin du programme.",
    ],
    itemsEn: [
      "Confirm enrollment with the Designated Learning Institution (DLI).",
      "Get the SIN if working (up to 24 h/week off-campus allowed).",
      "Open a student bank account (often free at major banks).",
      "Get health insurance from the institution (RAMQ does not cover most foreign students).",
      "Get a student card — gives access to many discounts.",
      "Find student housing or shared apartment — university residence or private lease.",
      "Buy a transit card (OPUS in Quebec, PRESTO in Ontario).",
      "Know the work rules: 24 h/week off-campus during sessions, full-time during breaks.",
      "Keep proof of enrollment and tuition payment — useful for PGWP at the end.",
      "Prepare the post-graduate work permit (PGWP) before program ends.",
    ],
  },
  {
    key: "asylum",
    emoji: "🕊️",
    titleFr: "Demandeur d'asile",
    titleEn: "Asylum seeker",
    subtitleFr: "Protection / Réfugié",
    subtitleEn: "Protection / Refugee",
    itemsFr: [
      "Faire la demande d'asile à l'ASFC ou à un bureau d'IRCC dès l'arrivée — entrevue de recevabilité.",
      "Obtenir le document du demandeur d'asile — preuve de statut, à conserver précieusement.",
      "Obtenir le PFSI (Programme fédéral de santé intérimaire) — couverture médicale temporaire.",
      "Demander le permis de travail ouvert (PT) — possible une fois la demande déposée.",
      "Demander l'aide sociale provinciale (PRAIDA au QC, Services sociaux ON) en attendant le PT.",
      "Trouver un hébergement — refuges (PRAIDA, YMCA, Logifem) ou logement transitoire.",
      "S'inscrire à la francisation gratuite (Québec) ou aux cours d'anglais (LINC en ON).",
      "Préparer son dossier pour la CISR (audience) — preuves, témoins, avocat (Aide juridique gratuite).",
      "Inscrire les enfants à l'école — droit garanti, gratuit même sans statut final.",
      "Contacter un organisme communautaire (Maison Haïtienne, ROCMI, TCRI) pour soutien complet.",
    ],
    itemsEn: [
      "Apply for asylum at CBSA or IRCC office on arrival — eligibility interview.",
      "Get the asylum claimant document — proof of status, keep safely.",
      "Get IFHP (Interim Federal Health Program) — temporary medical coverage.",
      "Apply for the open work permit (WP) — available once claim is filed.",
      "Apply for provincial social assistance (PRAIDA in QC, social services in ON) while waiting for WP.",
      "Find shelter — refuges (PRAIDA, YMCA, Logifem) or transitional housing.",
      "Enroll in free francisation (Quebec) or English classes (LINC in ON).",
      "Prepare your IRB hearing file — evidence, witnesses, lawyer (free Legal Aid).",
      "Enroll children in school — guaranteed right, free even without final status.",
      "Contact a community organization (Maison Haïtienne, ROCMI, TCRI) for full support.",
    ],
  },
];

const STORAGE_KEY = "@top10_progress_v1";

type ProgressMap = Record<string, boolean>; // `${statusKey}:${index}` -> true

export default function Top10Screen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [expanded, setExpanded] = useState<string>("worker");
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProgress(JSON.parse(raw) as ProgressMap);
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: ProgressMap) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(
    (statusKey: string, idx: number) => {
      const k = `${statusKey}:${idx}`;
      setProgress((prev) => {
        const next = { ...prev, [k]: !prev[k] };
        if (!next[k]) delete next[k];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const activeStatus = useMemo(
    () => STATUSES.find((s) => s.key === expanded) ?? null,
    [expanded]
  );

  const totals = useMemo(() => {
    if (!activeStatus) return { total: 0, done: 0, pct: 0 };
    const total = activeStatus.itemsFr.length;
    let done = 0;
    for (let i = 0; i < total; i++) {
      if (progress[`${activeStatus.key}:${i}`]) done++;
    }
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [progress, activeStatus]);

  const statusDone = useCallback(
    (statusKey: string, count: number) => {
      let n = 0;
      for (let i = 0; i < count; i++) {
        if (progress[`${statusKey}:${i}`]) n++;
      }
      return n;
    },
    [progress]
  );

  const resetAll = useCallback(() => {
    setProgress({});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#0ea5e9", "#0369a1"]}
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
              {isFr ? "Top 10 à faire" : "Top 10 to do"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr
                ? "Choisissez votre statut, cochez vos démarches"
                : "Choose your status, check your steps"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>🎯</Text>
          </View>
        </View>

        {/* Progress bar — for the currently selected status only */}
        {activeStatus ? (
          <View style={styles.progressWrap}>
            <Text style={styles.progressTitle}>
              {activeStatus.emoji}{" "}
              {isFr ? activeStatus.titleFr : activeStatus.titleEn}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${totals.pct}%` },
                ]}
              />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {totals.done} / {totals.total} ·{" "}
                {isFr ? "complétées" : "completed"} ({totals.pct}%)
              </Text>
              {totals.done > 0 && (
                <Pressable onPress={resetAll} hitSlop={8}>
                  <Text style={styles.resetLink}>
                    {isFr ? "Réinitialiser" : "Reset"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.progressWrap}>
            <Text style={styles.progressHint}>
              {isFr
                ? "👇 Touchez votre statut pour voir vos 10 démarches"
                : "👇 Tap your status to see your 10 steps"}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {totals.pct === 100 && (
          <View style={[styles.celebrate, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
            <Text style={{ fontSize: 22 }}>🎉</Text>
            <Text style={[styles.celebrateText, { color: "#166534" }]}>
              {isFr
                ? "Bravo ! Vous avez complété toutes vos démarches."
                : "Congratulations! You've completed all your steps."}
            </Text>
          </View>
        )}

        {STATUSES.map((s) => {
          const open = expanded === s.key;
          const items = isFr ? s.itemsFr : s.itemsEn;
          const done = statusDone(s.key, items.length);
          const allDone = done === items.length && items.length > 0;
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
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: allDone ? "#16a34a" : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: allDone ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {done}/{items.length}
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
                  {items.map((it, idx) => {
                    const checked = !!progress[`${s.key}:${idx}`];
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => toggle(s.key, idx)}
                        style={({ pressed }) => [
                          styles.item,
                          { opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            checked
                              ? { backgroundColor: "#16a34a", borderColor: "#16a34a" }
                              : { borderColor: colors.border },
                          ]}
                        >
                          {checked && (
                            <Feather name="check" size={14} color="#fff" />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: checked
                                ? colors.mutedForeground
                                : colors.foreground,
                              textDecorationLine: checked ? "line-through" : "none",
                            },
                          ]}
                        >
                          {it}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={[styles.footer, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {isFr
              ? "Vos cases cochées sont sauvegardées sur votre appareil. Pour un accompagnement personnalisé, contactez un organisme d'aide aux nouveaux arrivants."
              : "Your checked items are saved on your device. For personalized support, contact a newcomer aid organization."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 14,
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
  headerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { marginTop: 14 },
  progressTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  progressHint: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  progressText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  resetLink: { color: "rgba(255,255,255,0.85)", fontSize: 12, textDecorationLine: "underline" },
  celebrate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  celebrateText: { flex: 1, fontSize: 14, fontWeight: "700" },
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  list: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  item: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
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
