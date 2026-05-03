import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServiceCard } from "@/components/ServiceCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { useServicesData } from "@/contexts/ServicesContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import { useColors } from "@/hooks/useColors";
import { type Category, type ProvinceCode, type Service, PROVINCE_LABELS } from "@/data/services";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";
import { isOpenNow } from "@/utils/openHours";
import { haversineDistance } from "@/utils/location";
import { type LangCode, LANG_LABELS, inferLanguages } from "@/utils/serviceLanguages";
import { getProvince211 } from "@/utils/province211";
import { Linking } from "react-native";

/* ─────────── Step definitions ─────────── */

type Situation =
  | "parent"
  | "homeless"
  | "newcomer"
  | "distress"
  | "youth"
  | "elderly"
  | "general";

type Need =
  | "housing"
  | "food"
  | "mentalHealth"
  | "health"
  | "immigration"
  | "employment"
  | "family"
  | "social"
  | "legal";

interface Diagnosis {
  situation: Situation | null;
  need: Need | null;
  language: LangCode | null;
  useLocation: boolean;
  openNowOnly: boolean;
  urgentOnly: boolean;
}

const SITUATIONS: { key: Situation; iconFr: string; labelFr: string; labelEn: string; emoji: string }[] = [
  { key: "parent", iconFr: "users", labelFr: "Parent / famille", labelEn: "Parent / family", emoji: "👨‍👩‍👧" },
  { key: "homeless", iconFr: "home", labelFr: "Sans logement", labelEn: "Homeless", emoji: "🏚️" },
  { key: "newcomer", iconFr: "globe", labelFr: "Nouvel arrivant", labelEn: "Newcomer", emoji: "🌍" },
  { key: "distress", iconFr: "heart", labelFr: "Détresse / crise", labelEn: "Crisis / distress", emoji: "💔" },
  { key: "youth", iconFr: "user", labelFr: "Jeune (16-25)", labelEn: "Youth (16-25)", emoji: "🎓" },
  { key: "elderly", iconFr: "user-check", labelFr: "Personne âgée", labelEn: "Senior", emoji: "👵" },
  { key: "general", iconFr: "help-circle", labelFr: "Autre / général", labelEn: "Other / general", emoji: "❓" },
];

const NEEDS: { key: Need; cat: Category; labelFr: string; labelEn: string }[] = [
  { key: "housing", cat: "housing", labelFr: "Logement / hébergement", labelEn: "Housing / shelter" },
  { key: "food", cat: "food", labelFr: "Nourriture", labelEn: "Food" },
  { key: "mentalHealth", cat: "mentalHealth", labelFr: "Santé mentale", labelEn: "Mental health" },
  { key: "health", cat: "health", labelFr: "Santé / médical", labelEn: "Health / medical" },
  { key: "immigration", cat: "immigration", labelFr: "Papiers / immigration", labelEn: "Papers / immigration" },
  { key: "employment", cat: "employment", labelFr: "Emploi / formation", labelEn: "Employment / training" },
  { key: "family", cat: "family", labelFr: "Famille / enfants", labelEn: "Family / children" },
  { key: "social", cat: "social", labelFr: "Soutien social", labelEn: "Social support" },
  { key: "legal", cat: "social", labelFr: "Aide juridique", labelEn: "Legal aid" },
];

const LANGS: LangCode[] = ["fr", "en", "es", "ar", "ht", "zh"];

/* ─────────── Scoring algorithm ─────────── */

function scoreService(
  s: Service,
  d: Diagnosis,
  userLoc: { lat: number; lng: number } | null,
  userProvince: ProvinceCode,
): number {
  let score = 0;

  // Province filter — on garde les fiches de la province de l'utilisateur,
  // ET les ressources pancanadiennes (sans province ou marquées comme couvrant
  // tout le pays via `isProvinceWide` sans province précise, ex. 988, Jeunesse j'écoute).
  if (s.province && s.province !== userProvince) return -1000;

  // Need / category match
  const needDef = NEEDS.find((n) => n.key === d.need);
  if (needDef && s.category === needDef.cat) score += 50;

  // Situation-driven boosts
  if (d.situation === "homeless" && (s.category === "housing" || s.category === "food")) score += 20;
  if (d.situation === "distress" && (s.category === "mentalHealth" || s.isUrgent)) score += 25;
  if (d.situation === "newcomer" && (s.category === "immigration" || s.category === "social")) score += 20;
  if (d.situation === "parent" && s.category === "family") score += 15;
  if (d.situation === "youth" && (s.category === "employment" || s.category === "social")) score += 10;
  if (d.situation === "elderly" && (s.category === "health" || s.category === "social")) score += 15;

  // Language match
  if (d.language) {
    const langs = inferLanguages(s);
    if (langs.includes(d.language)) score += 25;
    if (d.language !== "fr" && !langs.includes(d.language)) score -= 20;
  }

  // Proximity
  if (d.useLocation && userLoc && s.coordinates) {
    const km = haversineDistance(userLoc, s.coordinates);
    if (km < 2) score += 30;
    else if (km < 5) score += 20;
    else if (km < 10) score += 10;
    else if (km < 25) score += 5;
  }

  // Open now
  if (d.openNowOnly) {
    const open = isOpenNow(s.hours);
    if (open === true) score += 15;
    else if (open === false) score -= 50; // strong filter, not eliminator
  }

  // Urgent boost / filter
  if (d.urgentOnly) {
    if (s.isUrgent) score += 20;
    else score -= 30;
  } else if (d.situation === "distress" && s.isUrgent) {
    score += 10;
  }

  // Quality signals
  if (s.badgeVerified) score += 5;
  if (s.featured) score += 3;

  return score;
}

/* ─────────── Screen ─────────── */

export default function DiagnosticScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { services } = useServicesData();
  const { userLocation, requestLocation } = useLocation();
  const { province: userProvince, setProvince: setUserProvince } = useUserProvince();
  const isFr = language !== "en";

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [diag, setDiag] = useState<Diagnosis>({
    situation: null,
    need: null,
    language: null,
    useLocation: false,
    openNowOnly: false,
    urgentOnly: false,
  });

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const totalSteps = 5;

  const { recommendations, langFallback } = useMemo(() => {
    if (step !== 4) return { recommendations: [], langFallback: false };

    // First pass: score with the chosen language
    let scored = services
      .map((s) => ({ s, score: scoreService(s, diag, userLocation, userProvince) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    // If user picked a non-FR/EN language and NO service actually speaks it,
    // fall back to FR/EN (re-score without the language criterion).
    let fallback = false;
    const lang = diag.language;
    if (lang && lang !== "fr" && lang !== "en") {
      const hasMatch = services.some((s) => inferLanguages(s).includes(lang));
      if (!hasMatch) {
        fallback = true;
        const diagNoLang = { ...diag, language: null };
        scored = services
          .map((s) => ({ s, score: scoreService(s, diagNoLang, userLocation, userProvince) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);
      }
    }

    return { recommendations: scored.slice(0, 12), langFallback: fallback };
  }, [step, services, diag, userLocation, userProvince]);

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 4) setStep((s) => (s + 1) as typeof step);
  }
  function back() {
    Haptics.selectionAsync();
    if (step > 0) setStep((s) => (s - 1) as typeof step);
    else router.back();
  }
  async function handleUseLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!userLocation) await requestLocation();
    setDiag((d) => ({ ...d, useLocation: true }));
    next();
  }

  function reset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDiag({ situation: null, need: null, language: null, useLocation: false, openNowOnly: false, urgentOnly: false });
    setStep(0);
  }

  /* Step content */
  const stepNode = (() => {
    if (step === 0) {
      return (
        <View style={styles.stepWrap}>
          <Text style={[styles.stepKicker, { color: colors.primary }]}>
            {isFr ? "Question 1 sur 5" : "Question 1 of 5"}
          </Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isFr ? "Quelle est votre situation actuelle ?" : "What is your current situation?"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isFr ? "Choisissez celle qui vous décrit le mieux." : "Pick the one that fits you best."}
          </Text>
          <View style={styles.optionGrid}>
            {SITUATIONS.map((opt) => {
              const active = diag.situation === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDiag((d) => ({ ...d, situation: opt.key }));
                  }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: active ? colors.primary + "14" : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]} numberOfLines={2}>
                    {isFr ? opt.labelFr : opt.labelEn}
                  </Text>
                  {active && (
                    <View style={[styles.optionCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={11} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.stepWrap}>
          <Text style={[styles.stepKicker, { color: colors.primary }]}>
            {isFr ? "Question 2 sur 5" : "Question 2 of 5"}
          </Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isFr ? "De quoi avez-vous besoin maintenant ?" : "What do you need right now?"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isFr ? "Le besoin le plus urgent en premier." : "The most urgent need first."}
          </Text>
          <View style={styles.listGrid}>
            {NEEDS.map((opt) => {
              const active = diag.need === opt.key;
              const catColor = getCategoryColor(opt.cat, colors);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDiag((d) => ({ ...d, need: opt.key }));
                  }}
                  style={({ pressed }) => [
                    styles.needRow,
                    {
                      backgroundColor: active ? catColor + "12" : colors.card,
                      borderColor: active ? catColor : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.needIcon, { backgroundColor: catColor + "20" }]}>
                    <Feather name={CATEGORY_ICONS[opt.cat] as any} size={16} color={catColor} />
                  </View>
                  <Text style={[styles.needLabel, { color: colors.foreground }]}>
                    {isFr ? opt.labelFr : opt.labelEn}
                  </Text>
                  {active && (
                    <Feather name="check-circle" size={18} color={catColor} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.stepWrap}>
          <Text style={[styles.stepKicker, { color: colors.primary }]}>
            {isFr ? "Question 3 sur 5" : "Question 3 of 5"}
          </Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isFr ? "Dans quelle langue préférez-vous être servi ?" : "Which language do you prefer?"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isFr ? "Nous prioriserons les organismes qui parlent votre langue." : "We will prioritize organizations that speak your language."}
          </Text>
          <View style={[styles.langNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="info" size={12} color={colors.mutedForeground} />
            <Text style={[styles.langNoteText, { color: colors.mutedForeground }]}>
              {isFr
                ? "L'interface de l'app reste en français/anglais. Si aucun service n'existe dans la langue choisie, on vous proposera ceux en français/anglais."
                : "The app interface stays in French/English. If no service exists in your chosen language, we'll show you French/English ones instead."}
            </Text>
          </View>
          <View style={styles.langGrid}>
            {LANGS.map((lang) => {
              const meta = LANG_LABELS[lang];
              const active = diag.language === lang;
              return (
                <Pressable
                  key={lang}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDiag((d) => ({ ...d, language: lang }));
                  }}
                  style={({ pressed }) => [
                    styles.langCard,
                    {
                      backgroundColor: active ? colors.primary + "14" : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.langFlag}>{meta.flag}</Text>
                  <Text style={[styles.langLabel, { color: colors.foreground }]}>
                    {isFr ? meta.fr : meta.en}
                  </Text>
                  {active && (
                    <View style={[styles.langCheck, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.stepWrap}>
          <Text style={[styles.stepKicker, { color: colors.primary }]}>
            {isFr ? "Question 4 sur 5" : "Question 4 of 5"}
          </Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isFr ? "Où êtes-vous ?" : "Where are you?"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isFr ? "On peut prioriser les services proches de vous." : "We can prioritize nearby services."}
          </Text>

          <Pressable
            onPress={handleUseLocation}
            style={({ pressed }) => [
              styles.bigChoice,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.bigChoiceIconWhite}>
              <Feather name="navigation" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bigChoiceTitle}>
                {isFr ? "Utiliser ma position" : "Use my location"}
              </Text>
              <Text style={styles.bigChoiceSub}>
                {isFr ? "Recommandé · résultats les plus pertinents" : "Recommended · most relevant results"}
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => { setDiag((d) => ({ ...d, useLocation: false })); next(); }}
            style={({ pressed }) => [
              styles.bigChoiceOutline,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.bigChoiceIcon, { backgroundColor: colors.muted }]}>
              <Feather name="globe" size={18} color={colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigChoiceTitleAlt, { color: colors.foreground }]}>
                {isFr
                  ? `Tout — ${PROVINCE_LABELS[userProvince]}`
                  : `All of ${PROVINCE_LABELS[userProvince]}`}
              </Text>
              <Text style={[styles.bigChoiceSub, { color: colors.mutedForeground }]}>
                {isFr ? "Sans géolocalisation" : "Without geolocation"}
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      );
    }

    if (step === 4 - 0) {
      // step 4 — extras + result CTA
      return (
        <View style={styles.stepWrap}>
          <Text style={[styles.stepKicker, { color: colors.primary }]}>
            {isFr ? "Question 5 sur 5" : "Question 5 of 5"}
          </Text>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>
            {isFr ? "Vos critères" : "Your criteria"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
            {isFr ? "Optionnel — affine les résultats." : "Optional — refines results."}
          </Text>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDiag((d) => ({ ...d, openNowOnly: !d.openNowOnly }));
            }}
            style={({ pressed }) => [
              styles.toggle,
              {
                backgroundColor: diag.openNowOnly ? "#10b981" + "14" : colors.card,
                borderColor: diag.openNowOnly ? "#10b981" : colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.toggleIcon, { backgroundColor: diag.openNowOnly ? "#10b981" : colors.muted }]}>
              <Feather name="clock" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                {isFr ? "Ouvert maintenant" : "Open now"}
              </Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                {isFr ? "Prioriser les organismes ouverts à cette heure" : "Prioritize organizations open right now"}
              </Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                { backgroundColor: diag.openNowOnly ? "#10b981" : colors.muted },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: diag.openNowOnly ? 16 : 0 }] },
                ]}
              />
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDiag((d) => ({ ...d, urgentOnly: !d.urgentOnly }));
            }}
            style={({ pressed }) => [
              styles.toggle,
              {
                backgroundColor: diag.urgentOnly ? "#dc2626" + "14" : colors.card,
                borderColor: diag.urgentOnly ? "#dc2626" : colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.toggleIcon, { backgroundColor: diag.urgentOnly ? "#dc2626" : colors.muted }]}>
              <Feather name="alert-triangle" size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                {isFr ? "Urgences seulement" : "Urgent only"}
              </Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                {isFr ? "Crise, sans-abri, ligne de détresse" : "Crisis, homeless, distress lines"}
              </Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                { backgroundColor: diag.urgentOnly ? "#dc2626" : colors.muted },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: diag.urgentOnly ? 16 : 0 }] },
                ]}
              />
            </View>
          </Pressable>

          {/* Results section */}
          <View style={styles.resultsHeader}>
            <View style={[styles.resultsBadge, { backgroundColor: colors.primary }]}>
              <Feather name="cpu" size={12} color="#fff" />
              <Text style={styles.resultsBadgeText}>
                {isFr ? "DIAGNOSTIC IA" : "AI DIAGNOSIS"}
              </Text>
            </View>
            <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
              {recommendations.length > 0
                ? (isFr
                    ? `${recommendations.length} services pour vous`
                    : `${recommendations.length} services for you`)
                : (isFr ? "Aucun résultat" : "No matches")}
            </Text>
            <Text style={[styles.resultsSub, { color: colors.mutedForeground }]}>
              {isFr
                ? "Triés par pertinence pour votre situation."
                : "Sorted by relevance for your situation."}
            </Text>
            {langFallback && diag.language && (
              <View style={[styles.langFallbackBanner, { backgroundColor: "#fff7ed", borderColor: "#fdba74" }]}>
                <Feather name="alert-circle" size={14} color="#c2410c" />
                <Text style={[styles.langFallbackText, { color: "#9a3412" }]}>
                  {isFr
                    ? `Aucun service en ${LANG_LABELS[diag.language].fr.toLowerCase()} trouvé. Voici les meilleurs résultats en français/anglais.`
                    : `No service in ${LANG_LABELS[diag.language].en.toLowerCase()} found. Here are the best results in French/English.`}
                </Text>
              </View>
            )}
          </View>

          {recommendations.map(({ s, score }, idx) => (
            <View key={s.id} style={styles.recoWrap}>
              <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? colors.primary : colors.muted }]}>
                <Text style={[styles.rankText, { color: idx < 3 ? "#fff" : colors.mutedForeground }]}>
                  {idx + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <ServiceCard service={s} compact />
                <View style={styles.matchRow}>
                  <Feather name="target" size={10} color={colors.primary} />
                  <Text style={[styles.matchText, { color: colors.primary }]}>
                    {isFr ? "Pertinence " : "Match "}{Math.min(99, Math.round(score))}%
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {recommendations.length === 0 && (() => {
            const info = getProvince211(userProvince);
            const provLabel = PROVINCE_LABELS[userProvince];
            return (
              <View style={[styles.emptyReco, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.empty211Badge, { backgroundColor: colors.primary }]}>
                  <Feather name="phone-call" size={18} color="#fff" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {isFr
                    ? `Aucun service trouvé en ${provLabel}`
                    : `No service found in ${provLabel}`}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isFr
                    ? `Le 211 est gratuit, confidentiel et 24 h/24. Une intervenante de votre région vous orientera vers le bon organisme.`
                    : `211 is free, confidential and available 24/7. A specialist in your region will direct you to the right organization.`}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    Linking.openURL(`tel:${info.dial.replace(/[^0-9+]/g, "")}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isFr ? `Appeler ${info.display}` : `Call ${info.display}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.empty211Btn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="phone" size={16} color="#fff" />
                  <Text style={styles.empty211BtnText}>
                    {isFr ? `Appeler ${info.display}` : `Call ${info.display}`}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    Linking.openURL(info.website);
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={isFr ? `Ouvrir le site 211 ${provLabel}` : `Open 211 ${provLabel} website`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.empty211Link,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="external-link" size={14} color={colors.foreground} />
                  <Text style={[styles.empty211LinkText, { color: colors.foreground }]}>
                    {isFr ? `Voir le site 211 ${provLabel}` : `Visit 211 ${provLabel} website`}
                  </Text>
                </Pressable>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                  {isFr
                    ? "Astuce : essayez de changer de province ci-dessus, ou retirez le filtre « ouvert maintenant »."
                    : "Tip: try changing the province above, or remove the \"open now\" filter."}
                </Text>
              </View>
            );
          })()}

          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.resetBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="refresh-ccw" size={14} color={colors.foreground} />
            <Text style={[styles.resetText, { color: colors.foreground }]}>
              {isFr ? "Recommencer le diagnostic" : "Restart diagnosis"}
            </Text>
          </Pressable>
        </View>
      );
    }

    return null;
  })();

  /* Footer nav button visibility */
  const canAdvance = (() => {
    if (step === 0) return diag.situation !== null;
    if (step === 1) return diag.need !== null;
    if (step === 2) return diag.language !== null;
    if (step === 3) return true;
    return false;
  })();
  const showFooter = step < 4;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#064e3b", "#0e7e6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={back} hitSlop={12} style={styles.backBtn}>
            <Feather name={step === 0 ? "x" : "arrow-left"} size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerKicker}>{isFr ? "DIAGNOSTIC IA" : "AI DIAGNOSIS"}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isFr ? "Trouver mon service" : "Find my service"}
            </Text>
          </View>
          {step < 4 && (
            <Text style={styles.stepCounter}>
              {step + 1}/{totalSteps}
            </Text>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (showFooter ? 100 : 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.provinceBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={[styles.provinceBarLabel, { color: colors.mutedForeground }]}>
            {isFr ? "Ma province :" : "My province:"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.provinceBarChips}
          >
            {(["QC","ON","BC","AB","MB","SK","NB","NS","PE","NL","YT","NT","NU"] as ProvinceCode[]).map((code) => {
              const active = userProvince === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setUserProvince(code);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFr
                      ? `Choisir ${PROVINCE_LABELS[code]}`
                      : `Select ${PROVINCE_LABELS[code]}`
                  }
                  accessibilityState={{ selected: active }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={({ pressed }) => [
                    styles.provinceBarChip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.provinceBarChipText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        {step === 4 && (
          <Text style={[styles.provinceBarHint, { color: colors.mutedForeground }]}>
            {isFr
              ? `Résultats filtrés pour ${PROVINCE_LABELS[userProvince]}.`
              : `Results filtered for ${PROVINCE_LABELS[userProvince]}.`}
          </Text>
        )}
        {stepNode}
      </ScrollView>

      {showFooter && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            onPress={next}
            disabled={!canAdvance}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: canAdvance ? colors.primary : colors.muted,
                opacity: pressed && canAdvance ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.nextText, { color: canAdvance ? "#fff" : colors.mutedForeground }]}>
              {step === 3
                ? (isFr ? "Voir mes recommandations" : "See my recommendations")
                : (isFr ? "Continuer" : "Continue")}
            </Text>
            <Feather name="arrow-right" size={17} color={canAdvance ? "#fff" : colors.mutedForeground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 14,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  stepCounter: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },

  /* Step body */
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  provinceBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  provinceBarLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  provinceBarChips: {
    gap: 6,
    paddingRight: 6,
  },
  provinceBarChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 36,
    alignItems: "center",
  },
  provinceBarChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  provinceBarHint: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    textAlign: "center",
  },
  stepWrap: { gap: 12 },
  stepKicker: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  stepSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },

  /* Situation grid */
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  optionCard: {
    width: "47%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    justifyContent: "center",
    alignItems: "flex-start",
    position: "relative",
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
  },
  optionCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Need list */
  listGrid: { gap: 8, marginTop: 4 },
  needRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  needIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  needLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  /* Language grid */
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  langCard: {
    width: "47%",
    flexGrow: 1,
    minHeight: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    position: "relative",
  },
  langFlag: { fontSize: 26 },
  langLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  langCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  langNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  langNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
  langFallbackBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  langFallbackText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },

  /* Big choice (location step) */
  bigChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bigChoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bigChoiceIconWhite: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  bigChoiceTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  bigChoiceTitleAlt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  bigChoiceSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  bigChoiceOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },

  /* Toggles */
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },

  /* Results */
  resultsHeader: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: 6,
  },
  resultsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  resultsBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  resultsTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  resultsSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  recoWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -4,
    marginLeft: 6,
    marginBottom: 4,
  },
  matchText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  emptyReco: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  empty211Badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  empty211Btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  empty211BtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  empty211Link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  empty211LinkText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  resetText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  /* Footer */
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
