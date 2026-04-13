import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

import { UrgentButton } from "@/components/UrgentButton";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/data/services";
import { SERVICES } from "@/data/services";
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
  "childcare",
  "realestate",
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, toggleLanguage } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const totalServices = SERVICES.length;

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

  function handleQuickPrompt(prompt: string) {
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
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 8) + 100 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 18 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <View style={styles.logoBadge}>
              <Feather name="heart" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.heroAppName}>AIDORA QC</Text>
              <Text style={styles.heroTagline}>{t.tagline}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => { Haptics.selectionAsync(); toggleLanguage(); }}
            activeOpacity={0.75}
          >
            <Text style={styles.langFlag}>{language === "fr" ? "🇬🇧" : "🇫🇷"}</Text>
            <Text style={styles.langLabel}>{language === "fr" ? "EN" : "FR"}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalServices}+</Text>
            <Text style={styles.statLabel}>{language === "fr" ? "services" : "services"}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>10</Text>
            <Text style={styles.statLabel}>{language === "fr" ? "villes" : "cities"}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>24/7</Text>
            <Text style={styles.statLabel}>{language === "fr" ? "disponible" : "available"}</Text>
          </View>
        </View>

        {/* Search bar inside hero */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: "rgba(255,255,255,0.97)",
              borderColor: focused ? colors.primary : "transparent",
            },
          ]}
        >
          <Feather name="search" size={20} color={focused ? colors.primary : "#9ca3af"} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: "#111827" }]}
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            multiline={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              activeOpacity={0.85}
            >
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.body}>

        {/* ── Urgence ── */}
        <View style={styles.urgentWrap}>
          <UrgentButton />
        </View>

        {/* ── AI Banner ── */}
        <Pressable
          style={({ pressed }) => [
            styles.aiBanner,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/chat" as any);
          }}
        >
          <View style={[styles.aiBannerAccent, { backgroundColor: colors.primary }]} />
          <View style={[styles.aiBannerIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="cpu" size={22} color={colors.primary} />
          </View>
          <View style={styles.aiBannerText}>
            <Text style={[styles.aiBannerTitle, { color: colors.foreground }]}>
              {t.aiTitle}
            </Text>
            <Text style={[styles.aiBannerSub, { color: colors.mutedForeground }]}>
              {t.aiSubtitle}
            </Text>
          </View>
          <View style={[styles.aiBannerCta, { backgroundColor: colors.primary }]}>
            <Feather name="arrow-right" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* ── Suggestions rapides ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.sectionExamples}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {t.quickPrompts.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.promptChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleQuickPrompt(prompt)}
                activeOpacity={0.75}
              >
                <Feather name="chevron-right" size={12} color={colors.primary} />
                <Text style={[styles.promptText, { color: colors.foreground }]} numberOfLines={1}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Catégories ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.sectionCategories}
          </Text>
          <View style={styles.catGrid}>
            {ALL_CATEGORIES.map((cat) => {
              const color = getCategoryColor(cat, colors);
              const icon = CATEGORY_ICONS[cat] as keyof typeof Feather.glyphMap;
              return (
                <Pressable
                  key={cat}
                  style={({ pressed }) => [
                    styles.catCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: color + "18" }]}>
                    <Feather name={icon} size={20} color={color} />
                  </View>
                  <Text
                    style={[styles.catLabel, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {t.categories[cat]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Hero */
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAppName: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  langFlag: { fontSize: 14 },
  langLabel: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  /* Search inside hero */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  searchBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Body */
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 0,
  },
  urgentWrap: {
    marginBottom: 14,
  },

  /* AI Banner */
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiBannerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  aiBannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 6,
  },
  aiBannerText: { flex: 1, gap: 3 },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  aiBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  aiBannerCta: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Sections */
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  /* Quick prompts horizontal */
  quickScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 220,
  },
  promptText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },

  /* Category grid 2-col */
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catCard: {
    width: "47.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 17,
  },
});
