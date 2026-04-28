import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { markOnboardingSeen } from "@/lib/onboarding";

const { width } = Dimensions.get("window");

type Slide = {
  emoji: string;
  icon: keyof typeof Feather.glyphMap;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "🔍",
    icon: "search",
    titleFr: "Trouvez le bon service",
    titleEn: "Find the right service",
    bodyFr: "Plus de 600 organismes communautaires du Québec, classés par catégorie et par proximité.",
    bodyEn: "Over 600 Quebec community organizations, sorted by category and proximity.",
  },
  {
    emoji: "📞",
    icon: "phone-call",
    titleFr: "Appelez en un clic",
    titleEn: "Call in one tap",
    bodyFr: "Téléphone, adresse et horaires disponibles même hors ligne. Aucune attente, aucun formulaire.",
    bodyEn: "Phone, address and hours available even offline. No waiting, no forms.",
  },
  {
    emoji: "🤖",
    icon: "message-circle",
    titleFr: "Demandez à l'assistant IA",
    titleEn: "Ask the AI assistant",
    bodyFr: "Décrivez votre situation en français, anglais, espagnol, arabe ou créole — l'IA vous oriente.",
    bodyEn: "Describe your situation in French, English, Spanish, Arabic or Creole — the AI guides you.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  async function finish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markOnboardingSeen();
    // Best-effort: ask for notification permission on the way out.
    registerForPushNotificationsAsync().catch(() => {});
    router.replace("/(tabs)");
  }

  function next() {
    if (index < SLIDES.length - 1) {
      const ni = index + 1;
      setIndex(ni);
      listRef.current?.scrollToIndex({ index: ni, animated: true });
      Haptics.selectionAsync();
    } else {
      finish();
    }
  }

  return (
    <LinearGradient
      colors={[colors.primary, "#0a5e52"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
    >
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text style={styles.skipText}>{isFr ? "Passer" : "Skip"}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.titleFr}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
            <View style={styles.slideIconWrap}>
              <Feather name={item.icon} size={28} color="#fff" />
            </View>
            <Text style={styles.slideTitle}>{isFr ? item.titleFr : item.titleEn}</Text>
            <Text style={styles.slideBody}>{isFr ? item.bodyFr : item.bodyEn}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.35)", width: i === index ? 22 : 8 },
            ]}
          />
        ))}
      </View>

      <Pressable
        onPress={next}
        style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.ctaText}>
          {index < SLIDES.length - 1 ? (isFr ? "Suivant" : "Next") : (isFr ? "Commencer" : "Get started")}
        </Text>
        <Feather name="arrow-right" size={18} color={colors.primary} />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipRow: {
    paddingHorizontal: 18,
    alignItems: "flex-end",
    marginBottom: 4,
  },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  slideEmoji: {
    fontSize: 72,
    marginBottom: 16,
    ...(Platform.OS === "web" ? { lineHeight: 84 } : {}),
  },
  slideIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  slideTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  slideBody: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginVertical: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cta: {
    marginHorizontal: 24,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#0e7e6e",
    fontSize: 16,
    fontWeight: "800",
  },
});
