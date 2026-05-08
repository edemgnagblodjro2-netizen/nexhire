import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
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

import { ServiceCard } from "@/components/ServiceCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { type Category } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";
import { haversineDistance } from "@/utils/location";
type SortMode = "default" | "az" | "distance" | "urgent";

// Childcare (La Place 0-5) is QC-only — filtered out at render time for other provinces.
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

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const { services } = useServicesData();
  const { userLocation, locationStatus, requestLocation } = useLocation();

  const visibleCategories = ALL_CATEGORIES;

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const isFr = language !== "en";
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  // Per-category counts (for chip badges)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of services) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [services]);

  // Liste des villes disponibles (top 60 par fréquence) — basée sur le sous-ensemble
  // déjà filtré par catégorie pour que le filtre Ville reste pertinent.
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const baseSet = activeCategory
      ? services.filter((s) => s.category === activeCategory)
      : services;
    for (const s of baseSet) {
      const c = (s.city ?? "").trim();
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [services, activeCategory]);

  const availableCities = useMemo(
    () =>
      Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
        .slice(0, 60),
    [cityCounts],
  );

  const filtered = useMemo(() => {
    let result = services;
    if (activeCategory) {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (activeCity) {
      const target = activeCity.toLowerCase();
      result = result.filter((s) => (s.city ?? "").trim().toLowerCase() === target);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.subcategory ?? "").toLowerCase().includes(q) ||
          (s.city ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortMode === "az") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    } else if (sortMode === "urgent") {
      result = [...result].sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return 0;
      });
    } else if (sortMode === "distance" && userLocation) {
      result = [...result].sort((a, b) => {
        const da = a.coordinates ? haversineDistance(userLocation, a.coordinates) : Infinity;
        const db = b.coordinates ? haversineDistance(userLocation, b.coordinates) : Infinity;
        return da - db;
      });
    }
    return result;
  }, [services, query, activeCategory, activeCity, sortMode, userLocation]);

  const count = filtered.length;
  const totalCount = services.length;

  async function handleSortPress(mode: SortMode) {
    Haptics.selectionAsync();
    if (mode === "distance" && !userLocation) {
      await requestLocation();
    }
    setSortMode(mode);
  }

  function clearFilters() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(null);
    setActiveCity(null);
    setQuery("");
    setSortMode("default");
  }

  const hasActiveFilter = !!activeCategory || !!activeCity || !!query.trim() || sortMode !== "default";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero header with gradient ── */}
      <LinearGradient
        colors={["#064e3b", "#0e7e6e", "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 14 }]}
      >
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />

        <View style={styles.headerTop}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)" as any);
            }}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityLabel={isFr ? "Retour" : "Back"}
          >
            <Feather name="chevron-left" size={26} color="#fff" />
          </Pressable>
          <View style={styles.headerBadge}>
            <Feather name="grid" size={16} color="#0e7e6e" />
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
              {t.servicesTitle}
            </Text>
            <Text style={styles.headerSub}>
              {hasActiveFilter
                ? `${count} / ${totalCount} ${count === 1 ? t.services : t.servicesPlural}`
                : `${totalCount} ${t.servicesPlural}${isFr ? " disponibles" : " available"}`}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: "rgba(255,255,255,0.97)",
              shadowColor: "#000",
            },
          ]}
        >
          <Feather name="search" size={17} color="#0a5e52" />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: "#0a0a0a" }]}
            placeholder={t.searchServices}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <View style={styles.clearBtn}>
                <Feather name="x" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Sticky filter rail ── */}
      <View style={[styles.filterRail, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              styles.allChip,
              {
                backgroundColor: activeCategory === null ? colors.primary : colors.card,
                borderColor: activeCategory === null ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveCategory(null); }}
            activeOpacity={0.85}
          >
            <Feather
              name="layers"
              size={12}
              color={activeCategory === null ? "#fff" : colors.foreground}
            />
            <Text
              style={[
                styles.chipText,
                {
                  color: activeCategory === null ? "#fff" : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                },
              ]}
            >
              {t.all}
            </Text>
            <View style={[styles.chipCount, { backgroundColor: activeCategory === null ? "rgba(255,255,255,0.25)" : colors.muted }]}>
              <Text style={[styles.chipCountText, { color: activeCategory === null ? "#fff" : colors.mutedForeground }]}>
                {totalCount}
              </Text>
            </View>
          </TouchableOpacity>

          {visibleCategories.map((cat) => {
            const catColor = getCategoryColor(cat, colors);
            const isActive = activeCategory === cat;
            const cnt = categoryCounts[cat] ?? 0;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? catColor : colors.card,
                    borderColor: isActive ? catColor : colors.border,
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setActiveCategory(isActive ? null : cat); }}
                activeOpacity={0.85}
              >
                <Feather name={CATEGORY_ICONS[cat] as any} size={12} color={isActive ? "#fff" : catColor} />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? "#fff" : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                    },
                  ]}
                >
                  {t.categories[cat]}
                </Text>
                {cnt > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : catColor + "20" }]}>
                    <Text style={[styles.chipCountText, { color: isActive ? "#fff" : catColor }]}>
                      {cnt > 999 ? "999+" : cnt}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* City filter row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langStrip}
        >
          <View style={styles.langStripLabel}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.langStripLabelText, { color: colors.mutedForeground }]}>
              {isFr ? "Ville" : "City"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setActiveCity(null); }}
            style={[
              styles.langChip,
              {
                backgroundColor: activeCity === null ? colors.primary + "18" : colors.card,
                borderColor: activeCity === null ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.langChipText,
                { color: activeCity === null ? colors.primary : colors.foreground },
              ]}
            >
              {isFr ? "Toutes" : "All"}
            </Text>
          </TouchableOpacity>
          {availableCities.map(([city, cnt]) => {
            const isActive = activeCity === city;
            return (
              <TouchableOpacity
                key={city}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveCity(isActive ? null : city);
                }}
                style={[
                  styles.langChip,
                  {
                    backgroundColor: isActive ? colors.primary + "18" : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.langChipText,
                    { color: isActive ? colors.primary : colors.foreground },
                  ]}
                >
                  {city}
                </Text>
                <View style={[styles.chipCount, { backgroundColor: isActive ? colors.primary + "22" : colors.muted }]}>
                  <Text style={[styles.chipCountText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                    {cnt > 999 ? "999+" : cnt}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sort row */}
        <View style={styles.sortRow}>
          <View style={styles.sortLabel}>
            <Feather name="sliders" size={11} color={colors.mutedForeground} />
            <Text style={[styles.sortLabelText, { color: colors.mutedForeground }]}>
              {isFr ? "Trier" : "Sort"}
            </Text>
          </View>
          {([
            { key: "default" as const, label: isFr ? "Pertinence" : "Relevance" },
            { key: "az" as const, label: "A–Z" },
            { key: "urgent" as const, label: isFr ? "Urgent" : "Urgent" },
            { key: "distance" as const, label: isFr ? "Proximité" : "Nearest" },
          ]).map((opt) => {
            const isSelected = sortMode === opt.key;
            const isLoading = opt.key === "distance" && locationStatus === "requesting";
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleSortPress(opt.key)}
                disabled={isLoading}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: isSelected ? colors.primary + "18" : "transparent",
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: isLoading ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    { color: isSelected ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {hasActiveFilter && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Feather name="x" size={11} color={colors.mutedForeground} />
              <Text style={[styles.clearAllText, { color: colors.mutedForeground }]}>
                {isFr ? "Effacer" : "Clear"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Service list (single column, rich cards) ── */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t.noResults}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {isFr
                ? "Essayez d'effacer un filtre ou de modifier votre recherche."
                : "Try clearing a filter or changing your search."}
            </Text>
            {hasActiveFilter && (
              <TouchableOpacity
                onPress={clearFilters}
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Feather name="refresh-ccw" size={14} color="#fff" />
                <Text style={styles.emptyCtaText}>
                  {isFr ? "Réinitialiser les filtres" : "Reset filters"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => <ServiceCard service={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Header (hero) ── */
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
    overflow: "hidden",
  },
  heroOrb1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -60,
    right: -50,
  },
  heroOrb2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -40,
    left: -30,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Sticky filter rail ── */
  filterRail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  allChip: {
    paddingLeft: 13,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  chipCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  chipCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  langStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
  },
  langStripLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  langStripLabelText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  langChipFlag: { fontSize: 14 },
  langChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    flexWrap: "wrap",
  },
  sortLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  sortLabelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: "auto",
  },
  clearAllText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  /* ── Empty state ── */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 19,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
