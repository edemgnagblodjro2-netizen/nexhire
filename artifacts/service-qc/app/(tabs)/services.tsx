import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { SERVICES, type Category, type Service } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";

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

function ServiceCard({ service }: { service: Service }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const categoryColor = getCategoryColor(service.category, colors);

  function handlePress() {
    Haptics.selectionAsync();
    router.push({ pathname: "/service/[id]", params: { id: service.id } });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.cardAccent, { backgroundColor: categoryColor }]} />
      <View style={styles.cardContent}>
        <Text
          style={[styles.cardName, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {service.name}
        </Text>
        <Text
          style={[styles.cardSub, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {service.subcategory}
        </Text>
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.catPill,
              { backgroundColor: categoryColor + "18" },
            ]}
          >
            <Feather
              name={CATEGORY_ICONS[service.category] as any}
              size={9}
              color={categoryColor}
            />
            <Text style={[styles.catPillText, { color: categoryColor }]}>
              {t.categories[service.category]}
            </Text>
          </View>
          {service.isUrgent && (
            <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    let result = SERVICES;
    if (activeCategory) {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.subcategory.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [query, activeCategory]);

  const count = filtered.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: topPadding + 8,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t.servicesTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {count} {count === 1 ? t.services : t.servicesPlural}
        </Text>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t.searchServices}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor:
                    activeCategory === null
                      ? colors.primary
                      : colors.card,
                  borderColor:
                    activeCategory === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      activeCategory === null ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                {t.all}
              </Text>
            </TouchableOpacity>
            {ALL_CATEGORIES.map((cat) => {
              const catColor = getCategoryColor(cat, colors);
              const isActive = activeCategory === cat;
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
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveCategory(isActive ? null : cat);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={CATEGORY_ICONS[cat] as any}
                    size={12}
                    color={isActive ? "#fff" : catColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {t.categories[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t.noResults}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t.noResultsText}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ServiceCard service={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingHorizontal: 10,
    gap: 0,
  },
  row: {
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: "space-between",
  },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  catPillText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
