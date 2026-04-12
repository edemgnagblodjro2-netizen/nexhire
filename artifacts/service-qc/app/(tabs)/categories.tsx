import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

import { useLanguage } from "@/contexts/LanguageContext";
import { SERVICES, type Category } from "@/data/services";
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
];

function CategoryCard({ category }: { category: Category }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const color = getCategoryColor(category, colors);
  const icon = CATEGORY_ICONS[category];

  const serviceCount = useMemo(
    () => SERVICES.filter((s) => s.category === category).length,
    [category]
  );

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/results",
      params: { category, query: "" },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: color + "12",
          borderColor: color + "30",
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={26} color={color} />
      </View>
      <Text style={[styles.catName, { color: colors.foreground }]}>
        {t.categories[category]}
      </Text>
      <Text style={[styles.catCount, { color: color }]}>
        {serviceCount} {serviceCount === 1 ? t.services : t.servicesPlural}
      </Text>
      <View style={[styles.arrow, { backgroundColor: color + "18" }]}>
        <Feather name="arrow-right" size={14} color={color} />
      </View>
    </Pressable>
  );
}

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

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
          {t.categoriesTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {ALL_CATEGORIES.length} {t.categoriesTitle.toLowerCase()}
        </Text>
      </View>

      <FlatList
        data={ALL_CATEGORIES}
        keyExtractor={(cat) => cat}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <CategoryCard category={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    padding: 16,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  catName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  catCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginTop: 4,
  },
});
