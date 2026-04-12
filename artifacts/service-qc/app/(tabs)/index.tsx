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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryChip } from "@/components/CategoryChip";
import { UrgentButton } from "@/components/UrgentButton";
import type { Category } from "@/data/services";
import { CATEGORY_LABELS } from "@/data/services";
import { useColors } from "@/hooks/useColors";
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

const QUICK_PROMPTS = [
  "Je n'ai nulle part où dormir",
  "J'ai besoin de nourriture",
  "Je me sens très stressé",
  "Je cherche du travail",
  "Aide pour ma famille",
  "Je suis un réfugié",
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      params: { query: CATEGORY_LABELS[category], category },
    });
  }

  function handleQuickPrompt(prompt: string) {
    setQuery(prompt);
    Haptics.selectionAsync();
    const result = detectCategory(prompt);
    router.push({
      pathname: "/results",
      params: { query: prompt, category: result.category ?? "all" },
    });
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
        <Text style={[styles.appName, { color: colors.primary }]}>
          ServiceQC
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Services communautaires du Québec
        </Text>
      </View>

      <View style={styles.urgentWrap}>
        <UrgentButton />
      </View>

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
          placeholder="Ex: j'ai besoin de nourriture..."
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
        <Text style={styles.searchButtonText}>Rechercher</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Exemples de demandes
        </Text>
        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={[
                styles.promptChip,
                {
                  backgroundColor: colors.surfaceSecondary ?? colors.muted,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleQuickPrompt(prompt)}
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
          Parcourir par catégorie
        </Text>
        <View style={styles.categories}>
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              onPress={handleCategoryPress}
            />
          ))}
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
  urgentWrap: {
    marginBottom: 24,
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
});
