import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const CHILDCARE_PORTAL_URL =
  "https://www.quebec.ca/famille-et-soutien-aux-personnes/enfance/garderies-et-services-de-garde/portail-inscription";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServiceCard } from "@/components/ServiceCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import type { Category, ProvinceCode } from "@/data/services";
import { PROVINCE_LABELS } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor, CATEGORY_ICONS } from "@/utils/categoryColors";
import { haversineDistance } from "@/utils/location";
import { normalizeCity } from "@/utils/cityMatch";

type SortMode = "default" | "city" | "distance";

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
];

export default function ResultsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { query, category, cityExact } = useLocalSearchParams<{
    query: string;
    category: string;
    cityExact: string;
  }>();

  const [selectedCategory, setSelectedCategory] = React.useState<
    Category | "all"
  >((category as Category) ?? "all");

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { services: rawServices } = useServicesData();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { province: userProvince } = useUserProvince();

  const services = rawServices;
  const visibleCategories = ALL_CATEGORIES;

  // Le portail "Inscription via La Place 0-5" est strictement réservé au
  // Québec (service gouvernemental QC). Il ne doit JAMAIS apparaître si :
  //   • la province de l'utilisateur (réglages) n'est pas QC, OU
  //   • l'utilisateur consulte explicitement une province ≠ QC via la
  //     recherche (ex: "Ontario" depuis la carte des provinces), OU
  //   • la ville filtrée appartient à un service hors-QC.
  const browsingProvince = useMemo<ProvinceCode | null>(() => {
    const q = (query ?? "").toLowerCase().trim();
    if (q) {
      for (const code of Object.keys(PROVINCE_LABELS) as ProvinceCode[]) {
        if ((PROVINCE_LABELS[code] ?? "").toLowerCase() === q) return code;
      }
    }
    if (cityExact) {
      const cityKey = normalizeCity(cityExact);
      const match = rawServices.find(
        (s) => normalizeCity(s.city) === cityKey
      );
      if (match) return (match.province ?? "QC") as ProvinceCode;
    }
    return null;
  }, [query, cityExact, rawServices]);

  const showChildcarePortal =
    selectedCategory === "childcare" &&
    userProvince === "QC" &&
    (browsingProvince === null || browsingProvince === "QC");

  const [sortMode, setSortMode] = React.useState<SortMode>("default");

  const filtered = useMemo(() => {
    const q = (query ?? "").toLowerCase().trim();
    // Exact-city mode: clicked from a city chip on the home screen.
    // Required to avoid substring collisions like "Victoria" ⊂ "Victoriaville".
    const cityKeyExact = normalizeCity(cityExact ?? "");
    const base = services.filter((s) => {
      const matchesCategory =
        selectedCategory === "all" || s.category === selectedCategory;
      if (cityKeyExact) {
        return matchesCategory && !s.isProvinceWide && normalizeCity(s.city) === cityKeyExact;
      }
      if (!q) return matchesCategory;
      // Province label match: when the user opens results from the province
      // carousel ("Ontario", "Colombie-Britannique", etc.), every service of
      // that province should appear, even if the city is "Toronto" or
      // "Vancouver" and the word "Ontario" never appears in name/city/desc.
      const provinceLabel = (PROVINCE_LABELS[(s.province ?? "QC") as ProvinceCode] ?? "").toLowerCase();
      const matchesText =
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.subcategory ?? "").toLowerCase().includes(q) ||
        provinceLabel.includes(q) ||
        (s.province ?? "").toLowerCase() === q;
      return matchesCategory && matchesText;
    });

    if (sortMode === "city") {
      return [...base].sort((a, b) => {
        if (a.isProvinceWide && !b.isProvinceWide) return -1;
        if (!a.isProvinceWide && b.isProvinceWide) return 1;
        return (a.city ?? "").localeCompare(b.city ?? "", "fr") ||
          a.name.localeCompare(b.name, "fr");
      });
    }

    if (sortMode === "distance" && userLocation) {
      return [...base].sort((a, b) => {
        const da = a.coordinates ? haversineDistance(userLocation, a.coordinates) : Infinity;
        const db = b.coordinates ? haversineDistance(userLocation, b.coordinates) : Infinity;
        return da - db;
      });
    }

    return base;
  }, [services, selectedCategory, query, cityExact, sortMode, userLocation]);

  function handleChipPress(cat: Category | "all") {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  }

  async function handleSortPress(mode: SortMode) {
    Haptics.selectionAsync();
    if (mode === "distance" && !userLocation) {
      await requestLocation();
    }
    setSortMode(mode);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {cityExact || query || (selectedCategory !== "all" ? t.categories[selectedCategory] : t.results)}
            </Text>
            <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
              {showChildcarePortal
                ? (language === "fr" ? "Portail externe — La Place 0-5" : "External portal — La Place 0-5")
                : `${filtered.length} ${filtered.length !== 1 ? t.servicesPlural : t.services}`}
            </Text>
          </View>
        </View>

        <FlatList
          horizontal
          data={["all" as const, ...visibleCategories]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            if (item === "all") {
              const isSelected = selectedCategory === "all";
              return (
                <Pressable
                  style={[
                    styles.allChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleChipPress("all")}
                >
                  <Text
                    style={[
                      styles.allChipText,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {t.all}
                  </Text>
                </Pressable>
              );
            }
            const isSelected = selectedCategory === item;
            const color = getCategoryColor(item, colors);
            const icon = CATEGORY_ICONS[item] as keyof typeof Feather.glyphMap;
            return (
              <Pressable
                style={[
                  styles.catFilterChip,
                  {
                    backgroundColor: isSelected ? color : colors.card,
                    borderColor: isSelected ? color : colors.border,
                  },
                ]}
                onPress={() => handleChipPress(item)}
              >
                <Feather
                  name={icon}
                  size={13}
                  color={isSelected ? "#fff" : color}
                />
                <Text
                  style={[
                    styles.catFilterText,
                    { color: isSelected ? "#fff" : colors.foreground },
                  ]}
                >
                  {t.categories[item]}
                </Text>
              </Pressable>
            );
          }}
        />

        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>
            {language === "fr" ? "Trier :" : "Sort:"}
          </Text>
          {([
            { key: "default" as const, label: language === "fr" ? "Pertinence" : "Relevance", icon: "list" as const },
            { key: "city" as const, label: language === "fr" ? "Ville A-Z" : "City A-Z", icon: "map-pin" as const },
            { key: "distance" as const, label: language === "fr" ? "Proximité" : "Nearest", icon: "navigation" as const },
          ]).map((opt) => {
            const isSelected = sortMode === opt.key;
            const isLoading = opt.key === "distance" && locationStatus === "requesting";
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: isLoading ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleSortPress(opt.key)}
                disabled={isLoading}
              >
                <Feather
                  name={opt.icon}
                  size={12}
                  color={isSelected ? "#fff" : colors.foreground}
                />
                <Text
                  style={[
                    styles.sortChipText,
                    { color: isSelected ? "#fff" : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {sortMode === "distance" && !userLocation && locationStatus !== "requesting" ? (
          <Text style={[styles.sortHint, { color: colors.mutedForeground }]}>
            {language === "fr"
              ? "Activez la géolocalisation pour trier par proximité."
              : "Enable location to sort by proximity."}
          </Text>
        ) : null}
      </View>

      {showChildcarePortal ? (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPadding + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.childcareCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.childcareIcon}>
              <Feather name="external-link" size={26} color="#fff" />
            </View>
            <Text style={[styles.childcareTitle, { color: colors.foreground }]}>
              {language === "fr"
                ? "Inscription via La Place 0-5"
                : "Registration via La Place 0-5"}
            </Text>
            <Text
              style={[styles.childcareSub, { color: colors.mutedForeground }]}
            >
              {language === "fr"
                ? "Au Québec, l'inscription en garderie subventionnée et en CPE se fait désormais uniquement via le portail officiel du gouvernement du Québec : La Place 0-5."
                : "In Quebec, registration for subsidized daycares and CPEs is now done exclusively through the official Quebec government portal: La Place 0-5."}
            </Text>
            <Text
              style={[styles.childcareSub, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              {language === "fr"
                ? "Vous y trouverez toutes les places disponibles, pourrez vous inscrire et suivre votre demande en ligne."
                : "You will find all available spots, register, and track your request online."}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.childcareButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Linking.openURL(CHILDCARE_PORTAL_URL);
              }}
            >
              <Feather name="external-link" size={16} color="#fff" />
              <Text style={styles.childcareButtonText}>
                {language === "fr"
                  ? "Ouvrir La Place 0-5"
                  : "Open La Place 0-5"}
              </Text>
            </Pressable>

            <Text
              style={[styles.childcareNote, { color: colors.mutedForeground }]}
            >
              {language === "fr"
                ? "💡 Astuce : certaines garderies privées non subventionnées peuvent aussi être trouvées via les pages Facebook locales de votre quartier."
                : "💡 Tip: some private non-subsidized daycares can also be found on local neighborhood Facebook pages."}
            </Text>
          </View>
        </ScrollView>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        renderItem={({ item }) => <ServiceCard service={item} />}
        ListHeaderComponent={
          selectedCategory === "realestate" ? (
            <Pressable
              style={({ pressed }) => [
                styles.guideBanner,
                {
                  backgroundColor: "#0e5c99" + "10",
                  borderColor: "#0e5c99" + "28",
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/buying-guide" as any);
              }}
            >
              <View style={styles.guideBannerIcon}>
                <Feather name="list" size={18} color="#fff" />
              </View>
              <View style={styles.guideBannerText}>
                <Text style={[styles.guideBannerTitle, { color: "#0e5c99" }]}>
                  {language === "fr" ? "Guide d'achat — 8 étapes" : "Buying Guide — 8 Steps"}
                </Text>
                <Text style={[styles.guideBannerSub, { color: colors.mutedForeground }]}>
                  {language === "fr"
                    ? "De la préqualification à la remise des clés"
                    : "From pre-qualification to key handover"}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color="#0e5c99" />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t.noResults}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t.noResultsText}
            </Text>
          </View>
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 24,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexWrap: "wrap",
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginRight: 2,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sortHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingTop: 6,
    fontStyle: "italic",
  },
  allChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  allChipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  catFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  catFilterText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 16,
    gap: 0,
  },
  guideBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  guideBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e5c99",
    flexShrink: 0,
  },
  guideBannerText: {
    flex: 1,
    gap: 2,
  },
  guideBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  guideBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 40,
  },
  childcareCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  childcareIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0e7e6e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  childcareTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  childcareSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  childcareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 18,
    marginBottom: 10,
  },
  childcareButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  childcareNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 17,
  },
});
