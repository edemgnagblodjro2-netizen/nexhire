import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

import { useLanguage } from "@/contexts/LanguageContext";
import { type Category, type Service } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
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
  "childcare",
  "realestate",
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
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
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
            <View style={styles.urgentBadge}>
              <View style={[styles.urgentDot, { backgroundColor: colors.urgent }]} />
              <Text style={[styles.urgentLabel, { color: colors.urgent }]}>
                Urgent
              </Text>
            </View>
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
  const { services } = useServicesData();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    let result = services;
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
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerBadge}>
            <Feather name="list" size={14} color={colors.primary} />
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t.servicesTitle}</Text>
            <Text style={styles.headerSub}>
              {count} {count === 1 ? t.services : t.servicesPlural}
              {activeCategory
                ? ` · ${t.categories[activeCategory]}`
                : language === "fr"
                ? " · Tous les services"
                : " · All services"}
            </Text>
          </View>
        </View>

        {/* Search bar in hero */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: "rgba(255,255,255,0.25)" },
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
      </LinearGradient>

      {/* Horizontal category chips */}
      <View style={[styles.chipsWrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: activeCategory === null ? colors.primary : colors.card,
                borderColor: activeCategory === null ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveCategory(null); }}
            activeOpacity={0.8}
          >
            <Feather
              name="layers"
              size={11}
              color={activeCategory === null ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.chipText, { color: activeCategory === null ? "#fff" : colors.mutedForeground }]}>
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
                onPress={() => { Haptics.selectionAsync(); setActiveCategory(isActive ? null : cat); }}
                activeOpacity={0.8}
              >
                <Feather name={CATEGORY_ICONS[cat] as any} size={11} color={isActive ? "#fff" : catColor} />
                <Text style={[styles.chipText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                  {t.categories[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={28} color={colors.mutedForeground} />
            </View>
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

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTexts: {
    gap: 2,
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
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  /* Chips */
  chipsWrapper: {
    borderBottomWidth: 1,
  },
  chipRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  /* List */
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  row: {
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 6,
  },

  /* Card */
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 115,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  urgentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  urgentLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },

  /* Empty */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
    gap: 12,
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
