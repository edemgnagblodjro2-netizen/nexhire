import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { UrgentButton } from "@/components/UrgentButton";
import { BrandFooter } from "@/components/BrandFooter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeniorScale } from "@/contexts/SeniorModeContext";
import { useLocation } from "@/contexts/LocationContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import { getApiBaseUrl } from "@/lib/apiBase";
import type { Category, ProvinceCode } from "@/data/services";
import { normalizeCity } from "@/utils/cityMatch";
import { PROVINCE_LABELS } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor, CATEGORY_ICONS } from "@/utils/categoryColors";
import { detectCategory } from "@/utils/detectCategory";
import { trackSearch } from "@/lib/analytics";
import { openAIChat } from "@/lib/aiChatBus";

const ALL_CATEGORIES: Category[] = [
  "housing",
  "food",
  "mentalHealth",
  "health",
  "immigration",
  "employment",
  "family",
  "social",
  "childcare",
  "realestate",
  "banking",
  "transport",
  "tourism",
];

// Module-level constant — never re-created on render.
// Pivot Québec : villes QC seulement.
const ALL_CITIES: ReadonlyArray<{ key: string; emoji: string }> = [
  { key: "Montréal", emoji: "🏙️" },
  { key: "Québec", emoji: "🏛️" },
  { key: "Laval", emoji: "🌆" },
  { key: "Longueuil", emoji: "🌉" },
  { key: "Gatineau", emoji: "🌉" },
  { key: "Sherbrooke", emoji: "🏞️" },
  { key: "Saguenay", emoji: "🐋" },
  { key: "Lévis", emoji: "⚓" },
  { key: "Trois-Rivières", emoji: "🏙️" },
  { key: "Brossard", emoji: "🌆" },
  { key: "Drummondville", emoji: "🏘️" },
  { key: "Repentigny", emoji: "🏘️" },
  { key: "Saint-Jérôme", emoji: "🏔️" },
  { key: "Terrebonne", emoji: "🏘️" },
  { key: "Saint-Jean-sur-Richelieu", emoji: "🏞️" },
  { key: "Châteauguay", emoji: "🏘️" },
  { key: "Granby", emoji: "🦓" },
  { key: "Blainville", emoji: "🌳" },
  { key: "Saint-Hyacinthe", emoji: "🌾" },
  { key: "Shawinigan", emoji: "🌲" },
  { key: "Victoriaville", emoji: "🍁" },
  { key: "Mascouche", emoji: "🏘️" },
  { key: "Mirabel", emoji: "✈️" },
  { key: "Joliette", emoji: "🏘️" },
  { key: "Salaberry-de-Valleyfield", emoji: "🌊" },
  { key: "Rouyn-Noranda", emoji: "⛏️" },
  { key: "Rimouski", emoji: "🌊" },
  { key: "Sept-Îles", emoji: "🏝️" },
  { key: "Baie-Comeau", emoji: "🌊" },
  { key: "Alma", emoji: "🌲" },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const seniorScale = useSeniorScale();
  const inputRef = useRef<TextInput>(null);

  const { services } = useServicesData();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { province: userProvince } = useUserProvince();
  const [query, setQuery] = useState("");
  const [newCount, setNewCount] = useState(0);

  // Cloche "quoi de neuf" — compte les services ajoutés depuis la dernière visite
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lastSeen = (await AsyncStorage.getItem("attentezero_whatsnew_lastseen_v1"))
          || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const url = `${getApiBaseUrl()}/api/services/new-since?since=${encodeURIComponent(lastSeen)}${userProvince ? `&province=${userProvince}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNewCount(Number(data?.count ?? 0));
      } catch {
        // silencieux : la cloche n'est pas critique
      }
    })();
    return () => { cancelled = true; };
  }, [userProvince]);
  const [focused, setFocused] = useState(false);

  async function handleRefreshLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestLocation({ force: true });
  }

  const totalServices = services.length;
  const totalCities = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (!s.isProvinceWide && s.city && s.city.trim().length > 0) {
        set.add(s.city.trim().toLowerCase());
      }
    }
    return set.size;
  }, [services]);
  const provinceCounts = React.useMemo(() => {
    const counts: Partial<Record<ProvinceCode, number>> = {};
    for (const s of services) {
      const p = (s.province ?? "QC") as ProvinceCode;
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return counts;
  }, [services]);

  // Single-pass O(N) precompute: normalized city name → service count.
  // Used by the "Find by city" chip row. Substring matching here would
  // collide ("Victoria" ⊂ "Victoriaville", "Laval" ⊂ "Lavaltrie"), so
  // we always compare normalized exact strings.
  const cityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of services) {
      if (s.isProvinceWide || !s.city) continue;
      const key = normalizeCity(s.city);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [services]);

  const visibleCities = useMemo(() => {
    const withCounts = ALL_CITIES.map((c) => ({
      ...c,
      count: cityCounts.get(normalizeCity(c.key)) ?? 0,
    }));
    const withServices = withCounts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
    const defaults = withCounts.slice(0, 4).filter((c) => c.count === 0);
    return [...withServices, ...defaults];
  }, [cityCounts]);
  const totalProvinces = Object.values(provinceCounts).filter((n) => (n ?? 0) > 0).length;
  const PROVINCE_ORDER: { code: ProvinceCode; emoji: string }[] = [
    { code: "QC", emoji: "⚜️" },
    { code: "ON", emoji: "🏙️" },
    { code: "BC", emoji: "🌊" },
    { code: "AB", emoji: "⛽" },
    { code: "MB", emoji: "🌾" },
    { code: "SK", emoji: "🌾" },
    { code: "NB", emoji: "🌊" },
    { code: "NS", emoji: "⚓" },
    { code: "PE", emoji: "🏝️" },
    { code: "NL", emoji: "🧊" },
    { code: "YT", emoji: "🏔️" },
    { code: "NT", emoji: "❄️" },
    { code: "NU", emoji: "🐻‍❄️" },
  ];

  function handleSearch() {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const result = detectCategory(query);
    // Nouveau tracker analytique avec session_id et écran courant.
    void trackSearch(result.category ?? "all", query.trim().length);
    // Compatibilité : on continue d'écrire dans search_events historique.
    fetch(`${getApiBaseUrl()}/api/search-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        province: "ALL",
        category: result.category ?? "all",
        queryLen: query.trim().length,
      }),
    }).catch(() => {});
    router.push({
      pathname: "/results",
      params: { query, category: result.category ?? "all" },
    });
  }

  function handleCategoryPress(category: Category) {
    Haptics.selectionAsync();
    router.push({
      pathname: "/results",
      params: { query: "", category },
    });
  }

  function handleQuickPrompt(prompt: string) {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(tabs)/chat" as any,
      params: { autoPrompt: prompt },
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 100 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 18 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <View style={styles.logoBadge}>
              <Image
                source={require("../../assets/images/icon_transparent.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.heroAppName, { fontSize: 22 * seniorScale }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                AttenteZéro <Text style={{ fontSize: 16 * seniorScale }}>⚜️</Text>
              </Text>
              <Text style={[styles.heroTagline, { fontSize: 12 * seniorScale }]} numberOfLines={1}>{t.tagline}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/whats-new" as any); }}
              activeOpacity={0.75}
              accessibilityLabel={language === "fr" ? "Nouveautés" : "What's new"}
            >
              <Feather name="bell" size={18} color="#fff" />
              {newCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText} numberOfLines={1}>
                    {newCount > 99 ? "99+" : String(newCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => { Haptics.selectionAsync(); toggleLanguage(); }}
              activeOpacity={0.75}
            >
              <Text style={styles.langFlag}>{language === "fr" ? "🇬🇧" : "🇫🇷"}</Text>
              <Text style={styles.langLabel}>{language === "fr" ? "EN" : "FR"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/profile" as any); }}
              activeOpacity={0.75}
              accessibilityLabel={language === "fr" ? "Mon compte" : "My account"}
            >
              <Feather name="user" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip — chaque cellule = 1 ligne max + auto-shrink pour éviter
            les wraps qui causent un layout shift visible au chargement (les
            polices Inter ne sont pas dispo immédiatement → mesure tardive). */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text
              style={styles.statNum}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {totalServices.toLocaleString(language === "fr" ? "fr-CA" : "en-CA")}
            </Text>
            <Text
              style={styles.statLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {language === "fr" ? "services" : "services"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={styles.statNum}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {totalCities}
            </Text>
            <Text
              style={styles.statLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {language === "fr" ? "villes" : "cities"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={styles.statNum}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              24/7
            </Text>
            <Text
              style={styles.statLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {language === "fr" ? "disponible" : "available"}
            </Text>
          </View>
        </View>

        {/* Disclaimer banner — independent app, not government */}
        <View style={styles.disclaimerBanner}>
          <Feather name="info" size={12} color="rgba(255,255,255,0.95)" />
          <Text style={styles.disclaimerText} numberOfLines={2}>
            {language === "fr"
              ? "Application indépendante. Non affiliée au gouvernement du Québec ni à 211 Québec."
              : "Independent app. Not affiliated with the Government of Quebec or 211 Québec."}
          </Text>
        </View>

        {/* Search bar inside hero */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: "rgba(255,255,255,0.97)",
              borderColor: focused ? colors.primary : "transparent",
            },
          ]}
        >
          <Feather name="search" size={20} color={focused ? colors.primary : "#9ca3af"} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: "#111827" }]}
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            multiline={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              activeOpacity={0.85}
            >
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.body}>

        {/* ── CTA principal : Demander à l'AI (24/7) ── */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            openAIChat();
          }}
          style={({ pressed }) => [
            styles.aiCta,
            { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          accessibilityLabel={language === "fr" ? "Demander à l'assistant AI" : "Ask the AI assistant"}
        >
          <View style={styles.aiCtaIconWrap}>
            <Feather name="message-circle" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCtaTitle}>
              {language === "fr" ? "Demander à l'assistant AI" : "Ask the AI assistant"}
            </Text>
            <Text style={styles.aiCtaSubtitle}>
              {language === "fr"
                ? "Réponse immédiate · 24/7 · gratuit"
                : "Instant answer · 24/7 · free"}
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color="#fff" />
        </Pressable>

        {/* ── Bannière slide (auto-rotation) — remontée au-dessus des tuiles ── */}
        <HomeBannerSlider />

        {/* ── Tuiles principales (style mockup épuré) ── */}
        <View style={styles.heroTilesGrid}>
          {([
            { cat: "food" as Category, icon: "shopping-bag" as const, label: language === "fr" ? "Aide alimentaire" : "Food aid", bg: "#FFF4E6", accent: "#EA580C", border: "#FED7AA" },
            { cat: "housing" as Category, icon: "home" as const, label: language === "fr" ? "Logement" : "Housing", bg: "#E6F0FF", accent: "#2563EB", border: "#BFDBFE" },
            { cat: "health" as Category, icon: "heart" as const, label: language === "fr" ? "Santé" : "Health", bg: "#FFE6EC", accent: "#E11D48", border: "#FECDD3" },
            { cat: "employment" as Category, icon: "briefcase" as const, label: language === "fr" ? "Emploi" : "Employment", bg: "#F0E7FF", accent: "#7C3AED", border: "#DDD6FE" },
            { cat: "social" as Category, icon: "users" as const, label: language === "fr" ? "Soutien social" : "Social support", bg: "#E6F7F3", accent: "#0E7E6E", border: "#A7E5D5" },
            { cat: "immigration" as Category, icon: "globe" as const, label: language === "fr" ? "Immigration" : "Immigration", bg: "#FEF5E0", accent: "#D97706", border: "#FDE68A" },
          ]).map((tile) => (
            <Pressable
              key={tile.cat}
              style={({ pressed }) => [
                styles.heroTile,
                {
                  backgroundColor: tile.bg,
                  borderColor: tile.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              onPress={() => handleCategoryPress(tile.cat)}
            >
              <Feather name={tile.icon} size={42} color={tile.accent} strokeWidth={1.75} />
              <Text
                style={[styles.heroTileLabel, { color: tile.accent }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tile.label.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Lien vers toutes les catégories */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/categories" as any);
          }}
          style={({ pressed }) => [
            styles.allCategoriesLink,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="grid" size={14} color={colors.primary} />
          <Text style={[styles.allCategoriesLinkText, { color: colors.primary }]}>
            {language === "fr" ? "Voir toutes les catégories" : "See all categories"}
          </Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </Pressable>

        {/* ── Urgence ── */}
        <View style={styles.urgentWrap}>
          <UrgentButton />
        </View>

        {/* ── SOS Urgences Banner ── */}
        <Pressable
          style={({ pressed }) => [
            styles.sosBanner,
            { opacity: pressed ? 0.88 : 1 },
          ]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push("/sos" as any);
          }}
        >
          <LinearGradient
            colors={["#b91c1c", "#ef4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sosBannerGrad}
          >
            <View style={styles.sosBannerLeft}>
              <View style={styles.sosPulse}>
                <Feather name="phone-call" size={22} color="#fff" />
              </View>
              <View style={styles.sosBannerText}>
                <Text style={styles.sosBannerTitle}>
                  {language === "fr" ? "🚨 SOS Urgences" : "🚨 SOS Emergency"}
                </Text>
                <Text style={styles.sosBannerSub}>
                  {language === "fr"
                    ? "Police · Pompiers · Ambulance — triés par proximité"
                    : "Police · Fire · Ambulance — sorted by proximity"}
                </Text>
              </View>
            </View>
            <View style={styles.sosArrow}>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Diagnostic IA personnalisé ── */}
        <Pressable
          style={({ pressed }) => [
            styles.diagBanner,
            { opacity: pressed ? 0.92 : 1 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/diagnostic" as any);
          }}
        >
          <LinearGradient
            colors={["#064e3b", "#0e7e6e", "#10b981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.diagBannerGrad}
          >
            <View style={styles.diagBannerLeft}>
              <View style={styles.diagBannerIcon}>
                <Feather name="cpu" size={22} color="#10b981" />
              </View>
              <View style={styles.diagBannerText}>
                <View style={styles.diagBannerKickerRow}>
                  <View style={styles.diagBannerNewBadge}>
                    <Text style={styles.diagBannerNewText} numberOfLines={1}>NOUVEAU</Text>
                  </View>
                  <Text
                    style={styles.diagBannerKicker}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {language === "fr" ? "DIAGNOSTIC IA" : "AI DIAGNOSIS"}
                  </Text>
                </View>
                <Text
                  style={styles.diagBannerTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {language === "fr" ? "Trouver mon service en 1 minute" : "Find my service in 1 minute"}
                </Text>
                <Text style={styles.diagBannerSub} numberOfLines={2}>
                  {language === "fr"
                    ? "5 questions · recommandations personnalisées · langue, proximité, ouvert maintenant"
                    : "5 questions · personalized recommendations · language, proximity, open now"}
                </Text>
              </View>
            </View>
            <View style={styles.diagBannerArrow}>
              <Feather name="arrow-right" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Calculateur d'aides financières ── */}
        <Pressable
          style={({ pressed }) => [
            styles.calcBanner,
            { opacity: pressed ? 0.92 : 1 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/aide-financiere" as any);
          }}
        >
          <LinearGradient
            colors={["#14532d", "#16a34a", "#22c55e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.calcBannerGrad}
          >
            <View style={styles.calcBannerLeft}>
              <View style={styles.calcBannerIcon}>
                <Feather name="dollar-sign" size={22} color="#16a34a" />
              </View>
              <View style={styles.calcBannerText}>
                <View style={styles.calcBannerKickerRow}>
                  <View style={styles.calcBannerNewBadge}>
                    <Text style={styles.calcBannerNewText} numberOfLines={1}>POPULAIRE</Text>
                  </View>
                  <Text
                    style={styles.calcBannerKicker}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {language === "fr" ? "CALCULATEUR D'AIDES" : "BENEFITS CALCULATOR"}
                  </Text>
                </View>
                <Text
                  style={styles.calcBannerTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {language === "fr" ? "Combien j'ai droit ?" : "How much can I get?"}
                </Text>
                <Text style={styles.calcBannerSub} numberOfLines={2}>
                  {language === "fr"
                    ? "30 secondes · estimation Canada + Québec · ACE, Solidarité, ACT, SRG…"
                    : "30 seconds · Canada + Quebec estimate · CCB, Solidarity, CWB, GIS…"}
                </Text>
              </View>
            </View>
            <View style={styles.calcBannerArrow}>
              <Feather name="arrow-right" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Localisation ── */}
        <View style={styles.section}>
          <Pressable
            onPress={handleRefreshLocation}
            disabled={locationStatus === "requesting"}
            style={({ pressed }) => [
              styles.locationCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed || locationStatus === "requesting" ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.locationIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Feather
                name={locationStatus === "requesting" ? "loader" : userLocation ? "navigation" : "map-pin"}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.locationTitle, { color: colors.foreground }]} numberOfLines={1}>
                {locationStatus === "requesting"
                  ? language === "fr" ? "Localisation en cours…" : "Locating…"
                  : userLocation
                    ? language === "fr" ? "Localisation active" : "Location active"
                    : language === "fr" ? "Activer ma localisation" : "Enable my location"}
              </Text>
              <Text style={[styles.locationDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {userLocation
                  ? language === "fr" ? "Toucher pour rafraîchir" : "Tap to refresh"
                  : language === "fr" ? "Pour voir les services les plus proches" : "To see the closest services"}
              </Text>
            </View>
            <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* ── Villes ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {language === "fr" ? "Trouver par ville" : "Find by city"}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityScroll}
          >
            {visibleCities.map((city) => (
              <Pressable
                key={city.key}
                style={({ pressed }) => [
                  styles.cityChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({
                    pathname: "/results",
                    // cityExact ⇒ exact normalized city match in results.tsx,
                    // so "Victoria" doesn't bleed into "Victoriaville".
                    params: { cityExact: city.key, category: "all" },
                  });
                }}
              >
                <Text style={styles.cityEmoji}>{city.emoji}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.cityName, { color: colors.foreground }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {city.key}
                  </Text>
                  <Text
                    style={[styles.cityCount, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {city.count} {language === "fr" ? "services" : "services"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── AI Banner ── */}
        <Pressable
          style={({ pressed }) => [
            styles.aiBanner,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/chat" as any);
          }}
        >
          <View style={[styles.aiBannerAccent, { backgroundColor: colors.primary }]} />
          <View style={[styles.aiBannerIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="cpu" size={22} color={colors.primary} />
          </View>
          <View style={styles.aiBannerText}>
            <Text
              style={[styles.aiBannerTitle, { color: colors.foreground }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t.aiTitle}
            </Text>
            <Text
              style={[styles.aiBannerSub, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {t.aiSubtitle}
            </Text>
          </View>
          <View style={[styles.aiBannerCta, { backgroundColor: colors.primary }]}>
            <Feather name="arrow-right" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* ── Suggestions rapides ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.sectionExamples}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {t.quickPrompts.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.promptChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleQuickPrompt(prompt)}
                activeOpacity={0.75}
              >
                <Feather name="chevron-right" size={12} color={colors.primary} />
                <Text style={[styles.promptText, { color: colors.foreground }]} numberOfLines={1}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <BrandFooter />

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* CTA AI principal — taille compacte (alignée sur le bandeau "Application indépendante") */
  aiCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0e7e6e",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: "#0e7e6e",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  aiCtaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCtaTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  aiCtaSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },

  /* Hero */
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  heroAppName: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  langFlag: { fontSize: 14 },
  langLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 0,
  },
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 8,
  },
  disclaimerText: {
    flex: 1,
    color: "rgba(255,255,255,0.95)",
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "500",
  },
  statItem: {
    flex: 1,
    minWidth: 0, // permet à flex:1 de réellement rétrécir le contenu
    alignItems: "center",
    paddingHorizontal: 4, // un peu d'air entre dividers et chiffres
  },
  statNum: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    marginTop: 1,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  /* Search inside hero */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  searchBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Body */
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 0,
  },
  urgentWrap: {
    marginBottom: 14,
  },

  /* SOS Banner */
  sosBanner: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  sosBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sosBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sosPulse: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sosBannerText: {
    flex: 1,
    gap: 3,
  },
  sosBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sosBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },
  sosArrow: {
    flexShrink: 0,
  },

  /* Diagnostic IA Banner */
  calcBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  calcBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  calcBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
    minWidth: 0,
  },
  calcBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  calcBannerText: {
    flex: 1,
    minWidth: 0,
  },
  calcBannerKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  calcBannerNewBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  calcBannerNewText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#14532d",
    letterSpacing: 0.4,
  },
  calcBannerKicker: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 1,
    flexShrink: 1,
  },
  calcBannerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#fff",
  },
  calcBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.92)",
    marginTop: 2,
    lineHeight: 16,
  },
  calcBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  diagBanner: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  diagBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  diagBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  diagBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  diagBannerText: {
    flex: 1,
    minWidth: 0, // garantit que les Text à l'intérieur peuvent rétrécir
    gap: 4,
  },
  diagBannerKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diagBannerNewBadge: {
    backgroundColor: "#fde68a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diagBannerNewText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#92400e",
    letterSpacing: 0.6,
  },
  diagBannerKicker: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1.1,
  },
  diagBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  diagBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 15,
  },
  diagBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* City chips */
  cityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cityScroll: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 16,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  locationDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 150,
    maxWidth: 200,
  },
  cityEmoji: {
    fontSize: 22,
  },
  cityName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  cityCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  /* Provinces */
  provinceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  provinceTotalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  provinceTotalText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  provinceScroll: {
    gap: 10,
    paddingRight: 4,
  },
  provinceChip: {
    width: 124,
    borderRadius: 14,
    padding: 12,
    alignItems: "flex-start",
    gap: 2,
  },
  provinceEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  provinceCode: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  provinceName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  provinceCount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  provinceStatus: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },

  /* AI Banner */
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiBannerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  aiBannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 6,
  },
  aiBannerText: { flex: 1, minWidth: 0, gap: 3 },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  aiBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  aiBannerCta: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Sections */
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  /* Quick prompts horizontal */
  quickScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 220,
  },
  promptText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },

  /* Section header row (titre + lien "Tout voir") */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },

  /* Catégories — carrousel horizontal */
  catScrollContent: {
    gap: 10,
    paddingRight: 16,
    paddingVertical: 4,
  },
  catCardH: {
    width: 122,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconWrapH: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabelH: {
    fontSize: 12.5,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 15,
    textAlign: "center",
    minHeight: 30,
  },
  catCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 36,
    alignItems: "center",
  },
  catCountText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },

  /* Category grid 2-col (legacy, conservé au cas où) */
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
  },

  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0E7E6E",
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
  /* Hero tiles (mockup-style 2-col grid) */
  heroTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginTop: 4,
    marginBottom: 0,
  },
  heroTile: {
    width: "50%",
    aspectRatio: 1.7,
    paddingHorizontal: 6,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTileLabel: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.4,
    paddingHorizontal: 8,
  },
  allCategoriesLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 0,
    marginBottom: 14,
  },
  allCategoriesLinkText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
