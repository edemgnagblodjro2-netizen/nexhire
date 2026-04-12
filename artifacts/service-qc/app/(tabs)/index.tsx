import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
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

import { UrgentButton } from "@/components/UrgentButton";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor, CATEGORY_ICONS } from "@/utils/categoryColors";
import { detectCategory } from "@/utils/detectCategory";

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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const topPadding = Platform.OS === "web" ? 16 : 0;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  function handleSearch() {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const result = detectCategory(query);
    router.push({
      pathname: "/results",
      params: { query, category: result.category ?? "all" },
    });
  }

  function handleCategoryPress(category: Category) {
    Haptics.selectionAsync();
    router.push({
      pathname: "/results",
      params: { query: t.categories[category], category },
    });
  }

  function handleQuickPrompt(prompt: string, index: number) {
    setQuery(prompt);
    Haptics.selectionAsync();
    const result = detectCategory(prompt);
    router.push({
      pathname: "/results",
      params: { query: prompt, category: result.category ?? "all" },
    });
  }

  function handleToggleLanguage() {
    Haptics.selectionAsync();
    toggleLanguage();
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 24, paddingBottom: bottomPadding + 100 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.appName, { color: colors.primary }]}>
              AIDORA QC
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              {t.tagline}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.langToggle,
              { backgroundColor: colors.secondary ?? colors.muted, borderColor: colors.border },
            ]}
            onPress={handleToggleLanguage}
            activeOpacity={0.7}
          >
            <Text style={[styles.langFlag]}>
              {language === "fr" ? "🇬🇧" : "🇫🇷"}
            </Text>
            <Text style={[styles.langLabel, { color: colors.primary }]}>
              {language === "fr" ? "EN" : "FR"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.urgentWrap}>
        <UrgentButton />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.aiBanner,
          {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary + "28",
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(tabs)/chat" as any);
        }}
      >
        <View style={[styles.aiBannerIcon, { backgroundColor: colors.primary }]}>
          <Feather name="cpu" size={20} color="#fff" />
        </View>
        <View style={styles.aiBannerText}>
          <Text style={[styles.aiBannerTitle, { color: colors.primary }]}>
            {t.aiTitle}
          </Text>
          <Text style={[styles.aiBannerSub, { color: colors.mutedForeground }]}>
            {t.aiSubtitle}
          </Text>
        </View>
        <Feather name="arrow-right" size={16} color={colors.primary} />
      </Pressable>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            shadowColor: focused ? colors.primary : "#000",
          },
        ]}
      >
        <Feather
          name="search"
          size={20}
          color={focused ? colors.primary : colors.mutedForeground}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          multiline={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.searchButton,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.88 : query.trim() ? 1 : 0.5,
          },
        ]}
        onPress={handleSearch}
        disabled={!query.trim()}
      >
        <Feather name="search" size={18} color="#fff" />
        <Text style={styles.searchButtonText}>{t.searchButton}</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t.sectionExamples}
        </Text>
        <View style={styles.quickPrompts}>
          {t.quickPrompts.map((prompt, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.promptChip,
                {
                  backgroundColor: colors.surfaceSecondary ?? colors.muted,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleQuickPrompt(prompt, i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.promptText, { color: colors.foreground }]}>
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t.sectionCategories}
        </Text>
        <View style={styles.categories}>
          {ALL_CATEGORIES.map((cat) => {
            const color = getCategoryColor(cat, colors);
            const icon = CATEGORY_ICONS[cat] as keyof typeof Feather.glyphMap;
            return (
              <Pressable
                key={cat}
                style={({ pressed }) => [
                  styles.catChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleCategoryPress(cat)}
              >
                <Feather name={icon} size={14} color={color} />
                <Text style={[styles.catChipLabel, { color: colors.foreground }]}>
                  {t.categories[cat]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 0,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 4,
  },
  langFlag: {
    fontSize: 14,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  urgentWrap: {
    marginBottom: 16,
  },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiBannerText: {
    flex: 1,
    gap: 2,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  aiBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 32,
    shadowColor: "#0e7e6e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  quickPrompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catChipLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
