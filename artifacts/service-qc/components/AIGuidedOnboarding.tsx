import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocation } from "@/contexts/LocationContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import {
  PROVINCE_LABELS,
  type Category,
  type ProvinceCode,
} from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";

type GuidedLang = "fr" | "en" | "es" | "ar" | "ht";

interface CategoryOption {
  key: Category;
  icon: keyof typeof Feather.glyphMap;
  label: Record<GuidedLang, string>;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    key: "housing",
    icon: "home",
    label: { fr: "Logement", en: "Housing", es: "Vivienda", ar: "السكن", ht: "Lojman" },
  },
  {
    key: "food",
    icon: "shopping-bag",
    label: { fr: "Alimentation", en: "Food", es: "Comida", ar: "الغذاء", ht: "Manje" },
  },
  {
    key: "health",
    icon: "heart",
    label: { fr: "Santé", en: "Health", es: "Salud", ar: "الصحة", ht: "Sante" },
  },
  {
    key: "mentalHealth",
    icon: "smile",
    label: {
      fr: "Santé mentale",
      en: "Mental health",
      es: "Salud mental",
      ar: "الصحة النفسية",
      ht: "Sante mantal",
    },
  },
  {
    key: "immigration",
    icon: "globe",
    label: {
      fr: "Immigration",
      en: "Immigration",
      es: "Inmigración",
      ar: "الهجرة",
      ht: "Imigrasyon",
    },
  },
  {
    key: "employment",
    icon: "briefcase",
    label: { fr: "Emploi", en: "Employment", es: "Empleo", ar: "العمل", ht: "Travay" },
  },
  {
    key: "legal",
    icon: "shield",
    label: {
      fr: "Aide juridique",
      en: "Legal aid",
      es: "Asistencia legal",
      ar: "المساعدة القانونية",
      ht: "Èd legal",
    },
  },
  {
    key: "childcare",
    icon: "users",
    label: {
      fr: "Garde d'enfants",
      en: "Childcare",
      es: "Guardería",
      ar: "رعاية الأطفال",
      ht: "Gadri timoun",
    },
  },
  {
    key: "family",
    icon: "users",
    label: { fr: "Famille", en: "Family", es: "Familia", ar: "العائلة", ht: "Fanmi" },
  },
  {
    key: "social",
    icon: "users",
    label: {
      fr: "Soutien social",
      en: "Social support",
      es: "Apoyo social",
      ar: "الدعم الاجتماعي",
      ht: "Sipò sosyal",
    },
  },
  {
    key: "administrative",
    icon: "file-text",
    label: {
      fr: "Démarches admin.",
      en: "Admin services",
      es: "Trámites",
      ar: "الإدارة",
      ht: "Demach admin",
    },
  },
  {
    key: "realestate",
    icon: "key",
    label: {
      fr: "Achat immobilier",
      en: "Home buying",
      es: "Compra de casa",
      ar: "شراء عقار",
      ht: "Achte kay",
    },
  },
];

const PROVINCE_CODES: ProvinceCode[] = [
  "QC", "ON", "BC", "AB", "MB", "SK",
  "NB", "NS", "PE", "NL", "YT", "NT", "NU",
];

interface Texts {
  title: string;
  subtitle: string;
  step1Title: string;
  syncBtn: string;
  syncing: string;
  pickProvince: string;
  step2Title: (loc: string) => string;
  step2Sub: string;
  changeLocation: string;
  detectedCity: string;
  permDenied: string;
  notSupported: string;
  searchingNear: (cat: string, loc: string) => string;
  pickProvincePrompt: string;
}

const TEXTS: Record<GuidedLang, Texts> = {
  fr: {
    title: "👋 Bienvenue ! Je peux vous aider en 3 secondes",
    subtitle: "Partagez votre position pour des résultats près de chez vous, ou choisissez votre province.",
    step1Title: "1. Où êtes-vous ?",
    syncBtn: "Utiliser ma position (GPS)",
    syncing: "Localisation en cours…",
    pickProvince: "Choisir ma province",
    step2Title: (loc) => `📍 ${loc} — quel service cherchez-vous ?`,
    step2Sub: "Touchez une catégorie, je vous trouve les services les plus proches.",
    changeLocation: "Changer",
    detectedCity: "Localisation détectée",
    permDenied: "Position refusée. Choisissez votre province ci-dessous.",
    notSupported: "GPS indisponible. Choisissez votre province :",
    searchingNear: (cat, loc) => `Trouve-moi les services de ${cat} les plus proches à ${loc}.`,
    pickProvincePrompt: "Choisissez votre province :",
  },
  en: {
    title: "👋 Welcome! I can help you in 3 seconds",
    subtitle: "Share your location for results near you, or pick your province.",
    step1Title: "1. Where are you?",
    syncBtn: "Use my location (GPS)",
    syncing: "Locating…",
    pickProvince: "Pick my province",
    step2Title: (loc) => `📍 ${loc} — what do you need?`,
    step2Sub: "Tap a category, I'll find the closest services.",
    changeLocation: "Change",
    detectedCity: "Location detected",
    permDenied: "Location denied. Pick your province below.",
    notSupported: "GPS unavailable. Pick your province:",
    searchingNear: (cat, loc) => `Find me the closest ${cat} services in ${loc}.`,
    pickProvincePrompt: "Pick your province:",
  },
  es: {
    title: "👋 ¡Bienvenido! Puedo ayudarte en 3 segundos",
    subtitle: "Comparte tu ubicación o elige tu provincia.",
    step1Title: "1. ¿Dónde estás?",
    syncBtn: "Usar mi ubicación (GPS)",
    syncing: "Localizando…",
    pickProvince: "Elegir mi provincia",
    step2Title: (loc) => `📍 ${loc} — ¿qué necesitas?`,
    step2Sub: "Toca una categoría y encuentro los servicios más cercanos.",
    changeLocation: "Cambiar",
    detectedCity: "Ubicación detectada",
    permDenied: "Ubicación denegada. Elige tu provincia abajo.",
    notSupported: "GPS no disponible. Elige tu provincia:",
    searchingNear: (cat, loc) => `Encuéntrame los servicios de ${cat} más cercanos en ${loc}.`,
    pickProvincePrompt: "Elige tu provincia:",
  },
  ar: {
    title: "👋 أهلاً! يمكنني مساعدتك في 3 ثوانٍ",
    subtitle: "شارك موقعك للحصول على نتائج قريبة، أو اختر مقاطعتك.",
    step1Title: "1. أين أنت؟",
    syncBtn: "استخدم موقعي (GPS)",
    syncing: "جاري تحديد الموقع…",
    pickProvince: "اختر مقاطعتي",
    step2Title: (loc) => `📍 ${loc} — ما الذي تحتاجه؟`,
    step2Sub: "اضغط على فئة وسأجد لك أقرب الخدمات.",
    changeLocation: "تغيير",
    detectedCity: "تم تحديد الموقع",
    permDenied: "تم رفض الموقع. اختر مقاطعتك أدناه.",
    notSupported: "GPS غير متوفر. اختر مقاطعتك:",
    searchingNear: (cat, loc) => `ابحث لي عن أقرب خدمات ${cat} في ${loc}.`,
    pickProvincePrompt: "اختر مقاطعتك:",
  },
  ht: {
    title: "👋 Byenveni ! Mwen ka ede w nan 3 segond",
    subtitle: "Pataje pozisyon w pou rezilta tou pre, oswa chwazi pwovens ou.",
    step1Title: "1. Ki kote w ye ?",
    syncBtn: "Sèvi ak pozisyon mwen (GPS)",
    syncing: "K ap lokalize…",
    pickProvince: "Chwazi pwovens mwen",
    step2Title: (loc) => `📍 ${loc} — ki sa w bezwen ?`,
    step2Sub: "Peze yon kategori, m ap jwenn sèvis ki pi pre yo.",
    changeLocation: "Chanje",
    detectedCity: "Pozisyon detekte",
    permDenied: "Pozisyon refize. Chwazi pwovens ou anba a.",
    notSupported: "GPS pa disponib. Chwazi pwovens ou :",
    searchingNear: (cat, loc) => `Jwenn sèvis ${cat} ki pi pre yo nan ${loc} pou mwen.`,
    pickProvincePrompt: "Chwazi pwovens ou :",
  },
};

interface Props {
  language: GuidedLang;
  onSubmitPrompt: (prompt: string) => void;
}

export function AIGuidedOnboarding({ language, onSubmitPrompt }: Props) {
  const colors = useColors();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { province: userProvince, setProvince } = useUserProvince();
  const [step, setStep] = useState<"location" | "category">("location");
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  // Track if user manually picked a province so a late-arriving GPS fix
  // doesn't yank them back to "category" or override their choice.
  const manuallyAdvancedRef = useRef(false);
  const t = TEXTS[language] ?? TEXTS.fr;

  // Reverse-geocode when location becomes available (native only)
  useEffect(() => {
    if (!userLocation || Platform.OS === "web") return;
    let cancelled = false;
    setReverseLoading(true);
    Location.reverseGeocodeAsync({
      latitude: userLocation.lat,
      longitude: userLocation.lng,
    })
      .then((results) => {
        if (cancelled) return;
        const r = results[0];
        if (r) {
          const city = r.city || r.subregion || r.region || null;
          const region = r.region;
          setDetectedCity(city ? (region ? `${city}, ${region}` : city) : null);
          // Auto-set province from detected region if it matches a known code
          if (region) {
            const code = mapRegionToProvinceCode(region);
            if (code) setProvince(code);
          }
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setReverseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userLocation, setProvince]);

  // Once location is granted, move to step 2 — but never override a manual
  // province selection that already advanced the flow.
  useEffect(() => {
    if (
      locationStatus === "granted" &&
      step === "location" &&
      !manuallyAdvancedRef.current
    ) {
      setStep("category");
    }
  }, [locationStatus, step]);

  const handleSync = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    manuallyAdvancedRef.current = false;
    requestLocation({ force: true });
  }, [requestLocation]);

  const handlePickProvince = useCallback(
    (code: ProvinceCode) => {
      Haptics.selectionAsync();
      setProvince(code);
      manuallyAdvancedRef.current = true;
      setShowProvincePicker(false);
      setStep("category");
    },
    [setProvince],
  );

  const handleCategory = useCallback(
    (cat: CategoryOption) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const locLabel =
        detectedCity ?? PROVINCE_LABELS[userProvince] ?? "ma région";
      const catLabel = cat.label[language] ?? cat.label.fr;
      const prompt = t.searchingNear(catLabel.toLowerCase(), locLabel);
      onSubmitPrompt(prompt);
    },
    [detectedCity, userProvince, language, t, onSubmitPrompt],
  );

  const locationLabel =
    detectedCity ?? PROVINCE_LABELS[userProvince] ?? "Canada";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="map-pin" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.subtitle}
          </Text>
        </View>
      </View>

      {step === "location" && !showProvincePicker && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.step1Title}
          </Text>
          <Pressable
            onPress={handleSync}
            disabled={locationStatus === "requesting"}
            accessibilityRole="button"
            accessibilityLabel={t.syncBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || locationStatus === "requesting" ? 0.85 : 1,
              },
            ]}
          >
            {locationStatus === "requesting" ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="navigation" size={16} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>
              {locationStatus === "requesting" ? t.syncing : t.syncBtn}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowProvincePicker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.pickProvince}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="map" size={14} color={colors.foreground} />
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
              {t.pickProvince}
            </Text>
          </Pressable>
          {locationStatus === "denied" && (
            <Text style={[styles.hint, { color: "#dc2626" }]}>
              {t.permDenied}
            </Text>
          )}
        </View>
      )}

      {showProvincePicker && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.pickProvincePrompt}
          </Text>
          <View style={styles.provinceGrid}>
            {PROVINCE_CODES.map((code) => (
              <Pressable
                key={code}
                onPress={() => handlePickProvince(code)}
                accessibilityRole="button"
                accessibilityLabel={PROVINCE_LABELS[code]}
                style={({ pressed }) => [
                  styles.provinceChip,
                  {
                    backgroundColor:
                      userProvince === code ? colors.primary : colors.background,
                    borderColor:
                      userProvince === code ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.provinceChipText,
                    {
                      color:
                        userProvince === code ? "#fff" : colors.foreground,
                    },
                  ]}
                >
                  {PROVINCE_LABELS[code]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === "category" && !showProvincePicker && (
        <View style={styles.section}>
          <View style={styles.locBar}>
            <Feather name="check-circle" size={14} color={colors.primary} />
            <Text style={[styles.locText, { color: colors.foreground }]} numberOfLines={1}>
              {reverseLoading ? `${t.detectedCity}…` : locationLabel}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setStep("location");
              }}
              accessibilityRole="button"
              accessibilityLabel={t.changeLocation}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.changeBtn,
                { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.changeBtnText, { color: colors.mutedForeground }]}>
                {t.changeLocation}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.step2Title(locationLabel)}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            {t.step2Sub}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.catScroll}
          >
            {CATEGORY_OPTIONS.map((cat) => {
              const color = getCategoryColor(cat.key, colors);
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => handleCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label[language] ?? cat.label.fr}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={({ pressed }) => [
                    styles.catTile,
                    {
                      backgroundColor: color + "12",
                      borderColor: color + "40",
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: color + "22" }]}>
                    <Feather name={cat.icon} size={20} color={color} />
                  </View>
                  <Text
                    style={[styles.catLabel, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {cat.label[language] ?? cat.label.fr}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/**
 * Map a region/state name returned by reverseGeocode to a Canadian ProvinceCode.
 * expo-location returns strings like "Quebec", "Ontario", "British Columbia", "QC"…
 */
function mapRegionToProvinceCode(region: string): ProvinceCode | null {
  const r = region.trim().toLowerCase();
  const map: Record<string, ProvinceCode> = {
    "qc": "QC", "quebec": "QC", "québec": "QC",
    "on": "ON", "ontario": "ON",
    "bc": "BC", "british columbia": "BC", "colombie-britannique": "BC",
    "ab": "AB", "alberta": "AB",
    "mb": "MB", "manitoba": "MB",
    "sk": "SK", "saskatchewan": "SK",
    "nb": "NB", "new brunswick": "NB", "nouveau-brunswick": "NB",
    "ns": "NS", "nova scotia": "NS", "nouvelle-écosse": "NS", "nouvelle-ecosse": "NS",
    "pe": "PE", "prince edward island": "PE", "île-du-prince-édouard": "PE",
    "nl": "NL", "newfoundland and labrador": "NL", "newfoundland": "NL",
    "yt": "YT", "yukon": "YT",
    "nt": "NT", "northwest territories": "NT",
    "nu": "NU", "nunavut": "NU",
  };
  return map[r] ?? null;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  subtitle: { fontSize: 12, lineHeight: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700" },
  sectionSub: { fontSize: 12, lineHeight: 16, marginTop: -4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 4, textAlign: "center" },
  provinceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  provinceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  provinceChipText: { fontSize: 12, fontWeight: "600" },
  locBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  locText: { flex: 1, fontSize: 13, fontWeight: "600" },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeBtnText: { fontSize: 11, fontWeight: "600" },
  catScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  catTile: {
    width: 96,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 14 },
});
