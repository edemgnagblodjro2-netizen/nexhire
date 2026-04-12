import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServiceCard } from "@/components/ServiceCard";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/data/services";
import { SERVICES } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor, CATEGORY_ICONS } from "@/utils/categoryColors";

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
  const { query, category } = useLocalSearchParams<{
    query: string;
    category: string;
  }>();

  const [selectedCategory, setSelectedCategory] = React.useState<
    Category | "all"
  >((category as Category) ?? "all");

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return SERVICES;
    return SERVICES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  function handleChipPress(cat: Category | "all") {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
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
              {query || t.results}
            </Text>
            <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
              {filtered.length}{" "}
              {filtered.length !== 1 ? t.servicesPlural : t.services}
            </Text>
          </View>
        </View>

        <FlatList
          horizontal
          data={["all" as const, ...ALL_CATEGORIES]}
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
      </View>

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
});
