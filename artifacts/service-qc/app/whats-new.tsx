import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import { getApiBaseUrl } from "@/lib/apiBase";

type NewService = {
  id: string;
  name: string;
  category: string;
  city: string | null;
  province: string | null;
  createdAt: string;
};

const STORAGE_KEY = "attentezero_whatsnew_lastseen_v1";

export default function WhatsNewScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { province } = useUserProvince();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<NewService[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lastSeen = (await AsyncStorage.getItem(STORAGE_KEY))
          || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const url = `${getApiBaseUrl()}/api/services/new-since?since=${encodeURIComponent(lastSeen)}${province ? `&province=${province}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setCount(Number(data?.count ?? 0));
        setServices(Array.isArray(data?.services) ? data.services : []);
        // Marquer comme vu maintenant
        await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        if (!cancelled) {
          setServices([]);
          setCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [province]);

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      const now = Date.now();
      const diffMs = now - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return language === "fr" ? "Aujourd'hui" : "Today";
      if (diffDays === 1) return language === "fr" ? "Hier" : "Yesterday";
      if (diffDays < 7) return language === "fr" ? `Il y a ${diffDays} jours` : `${diffDays} days ago`;
      return d.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityLabel={language === "fr" ? "Retour" : "Back"}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Feather name="bell" size={18} color="#0E7E6E" />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {language === "fr" ? "Quoi de neuf" : "What's new"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0E7E6E" />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: "#E6F7F3" }]}>
            <Feather name="check-circle" size={40} color="#0E7E6E" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {language === "fr" ? "Vous êtes à jour !" : "You're all caught up!"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {language === "fr"
              ? "Aucun nouveau service depuis votre dernière visite. Revenez bientôt."
              : "No new services since your last visit. Come back soon."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{count}</Text>
            <Text style={styles.summaryLabel}>
              {language === "fr"
                ? `nouveau${count > 1 ? "x" : ""} service${count > 1 ? "s" : ""}${province ? ` au ${province}` : ""}`
                : `new service${count > 1 ? "s" : ""}${province ? ` in ${province}` : ""}`}
            </Text>
          </View>

          {services.map((svc) => (
            <Pressable
              key={svc.id}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/service/${svc.id}` as any);
              }}
              style={({ pressed }) => [
                styles.serviceCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.serviceCardLeft}>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={2}>
                  {svc.name}
                </Text>
                <Text style={[styles.serviceMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {[svc.city, svc.province].filter(Boolean).join(" • ") || svc.category}
                </Text>
                <Text style={[styles.serviceDate, { color: colors.mutedForeground }]}>
                  {formatDate(svc.createdAt)}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: "#0E7E6E",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: "center",
  },
  summaryNum: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    lineHeight: 42,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  serviceCardLeft: {
    width: 44,
    alignItems: "center",
  },
  newBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  serviceMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  serviceDate: {
    fontSize: 11,
    fontStyle: "italic",
  },
});
