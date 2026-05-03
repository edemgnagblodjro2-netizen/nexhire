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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import { type Category } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";

type Section = {
  key: string;
  titleFr: string;
  titleEn: string;
  categories: Category[];
};

const SECTIONS: Section[] = [
  {
    key: "logement",
    titleFr: "Logement & alimentation",
    titleEn: "Housing & food",
    categories: ["housing", "food", "realestate"],
  },
  {
    key: "sante",
    titleFr: "Santé & bien-être",
    titleEn: "Health & wellness",
    categories: ["health", "mentalHealth"],
  },
  {
    key: "famille",
    titleFr: "Famille & enfance",
    titleEn: "Family & children",
    categories: ["family", "childcare"],
  },
  {
    key: "emploi",
    titleFr: "Emploi & immigration",
    titleEn: "Work & immigration",
    categories: ["employment", "immigration"],
  },
  {
    key: "communaute",
    titleFr: "Communauté",
    titleEn: "Community",
    categories: ["social"],
  },
];

function CategoryTile({ category }: { category: Category }) {
  const colors = useColors();
  const router = useRouter();
  const { t, language } = useLanguage();
  const color = getCategoryColor(category, colors);
  const icon = CATEGORY_ICONS[category];
  const { services } = useServicesData();
  const { province: userProvince } = useUserProvince();

  // "La Place 0-5" portail = QC seulement. Ailleurs, comportement standard.
  const isExternalRedirect = category === "childcare" && userProvince === "QC";

  const serviceCount = useMemo(
    () => services.filter((s) => s.category === category).length,
    [services, category]
  );

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/results",
      params: { category, query: "" },
    });
  }

  const countLabel = isExternalRedirect
    ? language === "fr" ? "Portail" : "Portal"
    : serviceCount > 999 ? "999+" : String(serviceCount);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: color + "16" }]}>
        <Feather name={icon as any} size={26} color={color} />
        {isExternalRedirect && (
          <View style={[styles.tileExternalDot, { backgroundColor: color }]}>
            <Feather name="external-link" size={8} color="#fff" />
          </View>
        )}
      </View>

      <Text
        style={[styles.tileLabel, { color: colors.foreground }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {t.categories[category]}
      </Text>

      <Text style={[styles.tileCount, { color: colors.mutedForeground }]} numberOfLines={1}>
        {countLabel}
      </Text>
    </Pressable>
  );
}

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { services } = useServicesData();
  const isFr = language !== "en";

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [query, setQuery] = useState("");

  const totalServices = services.length;

  // Filtre les sections / tuiles selon la recherche par nom de catégorie.
  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((section) => ({
        ...section,
        categories: section.categories.filter((cat) => {
          const label = (t.categories[cat] ?? "").toLowerCase();
          return label.includes(q);
        }),
      }))
      .filter((s) => s.categories.length > 0);
  }, [query, t.categories]);

  function submitSearch() {
    const q = query.trim();
    if (!q) return;
    Haptics.selectionAsync();
    router.push({ pathname: "/results", params: { query: q, category: "all" } });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Compact gradient header ── */}
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 14 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerBadge}>
            <Feather name="grid" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isFr ? "Nos services" : "Our services"}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {isFr
                ? `${totalServices} ressources · ${SECTIONS.length} secteurs`
                : `${totalServices} resources · ${SECTIONS.length} sectors`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Search bar (overlapping the gradient like the reference design) ── */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              placeholder={isFr ? "Rechercher un service…" : "Search a service…"}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <View style={[styles.searchClear, { backgroundColor: colors.muted }]}>
                  <Feather name="x" size={11} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Sections ── */}
        {visibleSections.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {isFr ? "Aucune catégorie" : "No categories"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {isFr
                ? "Essayez un autre mot ou appuyez sur la loupe pour chercher dans tous les services."
                : "Try a different word or tap the magnifier to search across all services."}
            </Text>
            <TouchableOpacity
              onPress={submitSearch}
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name="search" size={14} color="#fff" />
              <Text style={styles.emptyCtaText}>
                {isFr ? "Chercher partout" : "Search everywhere"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          visibleSections.map((section, idx) => (
            <View key={section.key} style={[styles.section, idx === 0 && { marginTop: 4 }]}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {isFr ? section.titleFr : section.titleEn}
                </Text>
                <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
              </View>

              <View style={styles.grid}>
                {section.categories.map((cat) => (
                  <View key={cat} style={styles.gridCell}>
                    <CategoryTile category={cat} />
                  </View>
                ))}
                {/* Spacer cells to keep the last row 3-col aligned */}
                {section.categories.length % 3 !== 0 &&
                  Array.from({ length: 3 - (section.categories.length % 3) }).map((_, i) => (
                    <View key={`spacer-${i}`} style={styles.gridCell} />
                  ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingBottom: 36, // extra so the search bar overlaps cleanly
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  /* Scroll content */
  scrollContent: {
    paddingHorizontal: 14,
  },

  /* Search bar (lifted over the header) */
  searchWrap: {
    marginTop: -22,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    padding: 0,
  },
  searchClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Section */
  section: {
    marginBottom: 18,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  sectionDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },

  /* Grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  gridCell: {
    width: "33.333%",
    paddingHorizontal: 5,
    marginBottom: 10,
  },

  /* Tile */
  tile: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 118,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tileIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tileExternalDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 15,
  },
  tileCount: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },

  /* Empty state */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
