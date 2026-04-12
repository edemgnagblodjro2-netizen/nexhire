import { Feather } from "@expo/vector-icons";
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

import { CategoryChip } from "@/components/CategoryChip";
import { ServiceCard } from "@/components/ServiceCard";
import type { Category } from "@/data/services";
import { CATEGORY_LABELS, SERVICES } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";

const ALL_CATEGORIES: Category[] = [
  "housing",
  "food",
  "mentalHealth",
  "health",
  "immigration",
  "employment",
  "family",
  "social",
];

export default function ResultsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { query, category } = useLocalSearchParams<{
    query: string;
    category: string;
  }>();

  const [selectedCategory, setSelectedCategory] = React.useState<
    Category | "all"
  >((category as Category) ?? "all");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return SERVICES;
    return SERVICES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const catColor =
    selectedCategory !== "all"
      ? getCategoryColor(selectedCategory as Category, colors)
      : colors.primary;

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
              {query || CATEGORY_LABELS[selectedCategory as Category] || "Résultats"}
            </Text>
            <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
              {filtered.length} service{filtered.length !== 1 ? "s" : ""}
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
              return (
                <Pressable
                  style={[
                    styles.allChip,
                    {
                      backgroundColor:
                        selectedCategory === "all"
                          ? colors.primary
                          : colors.card,
                      borderColor:
                        selectedCategory === "all"
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory("all")}
                >
                  <Text
                    style={[
                      styles.allChipText,
                      {
                        color:
                          selectedCategory === "all"
                            ? "#fff"
                            : colors.foreground,
                      },
                    ]}
                  >
                    Tous
                  </Text>
                </Pressable>
              );
            }
            return (
              <CategoryChip
                category={item}
                selected={selectedCategory === item}
                onPress={(cat) => setSelectedCategory(cat)}
              />
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Aucun résultat
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Essayez une autre catégorie ou modifiez votre recherche.
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
  list: {
    padding: 16,
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
