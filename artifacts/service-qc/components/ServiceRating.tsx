import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiBase";

type Stats = {
  total: number;
  useful: number;
  notUseful: number;
  percentUseful: number | null;
  minToPublish: number;
};

type Props = {
  serviceId: string;
  accentColor?: string;
};

const VOTED_KEY_PREFIX = "attentezero.rating.voted.";

export function ServiceRating({ serviceId, accentColor }: Props) {
  const { language } = useLanguage();
  const colors = useColors();
  const isFr = language === "fr";

  const [stats, setStats] = useState<Stats | null>(null);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<"useful" | "not_useful" | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/rating-stats`);
      if (!r.ok) return;
      const j = (await r.json()) as Stats;
      setStats(j);
    } catch {
      // silent
    }
  }, [serviceId]);

  useEffect(() => {
    loadStats();
    // Best-effort: remember per-device that the user voted (the API also enforces 30d throttle by IP hash).
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      AsyncStorage.getItem(VOTED_KEY_PREFIX + serviceId).then((v: string | null) => {
        if (v === "useful" || v === "not_useful") {
          setHasVoted(true);
          setMyVote(v);
        }
      });
    } catch {
      // ignore
    }
  }, [serviceId, loadStats]);

  const sendVote = useCallback(
    async (value: "useful" | "not_useful") => {
      if (voting || hasVoted) return;
      setVoting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const r = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
        if (r.ok) {
          const j = (await r.json()) as Stats;
          setStats(j);
          setHasVoted(true);
          setMyVote(value);
          try {
            const AsyncStorage = require("@react-native-async-storage/async-storage").default;
            AsyncStorage.setItem(VOTED_KEY_PREFIX + serviceId, value);
          } catch {
            // ignore
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        // silent
      } finally {
        setVoting(false);
      }
    },
    [serviceId, voting, hasVoted],
  );

  const accent = accentColor ?? colors.primary;
  const showAggregate = stats?.percentUseful != null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="thumbs-up" size={16} color={accent} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isFr ? "Cette fiche vous a-t-elle été utile ?" : "Was this listing useful?"}
        </Text>
      </View>

      {showAggregate && stats ? (
        <View style={styles.aggregateRow}>
          <View style={[styles.percentBadge, { backgroundColor: accent + "18" }]}>
            <Text style={[styles.percentText, { color: accent }]}>
              {stats.percentUseful}% {isFr ? "utile" : "useful"}
            </Text>
          </View>
          <Text style={[styles.aggSub, { color: colors.mutedForeground }]}>
            {isFr ? "selon" : "based on"} {stats.total} {isFr ? "personnes" : "people"}
          </Text>
        </View>
      ) : stats && stats.total > 0 ? (
        <Text style={[styles.aggSub, { color: colors.mutedForeground, marginBottom: 10 }]}>
          {stats.total === 1
            ? isFr
              ? "1 personne a répondu"
              : "1 person responded"
            : isFr
              ? `${stats.total} personnes ont répondu (${stats.minToPublish} requis pour publier %)`
              : `${stats.total} people responded (${stats.minToPublish} needed to publish %)`}
        </Text>
      ) : null}

      <View style={styles.btnRow}>
        <Pressable
          disabled={voting || hasVoted}
          onPress={() => sendVote("useful")}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: myVote === "useful" ? "#16a34a" : colors.background,
              borderColor: myVote === "useful" ? "#16a34a" : colors.border,
              opacity: hasVoted && myVote !== "useful" ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather
            name="thumbs-up"
            size={16}
            color={myVote === "useful" ? "#fff" : "#16a34a"}
          />
          <Text
            style={[
              styles.btnText,
              { color: myVote === "useful" ? "#fff" : colors.foreground },
            ]}
          >
            {isFr ? "Utile" : "Useful"}
          </Text>
        </Pressable>

        <Pressable
          disabled={voting || hasVoted}
          onPress={() => sendVote("not_useful")}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: myVote === "not_useful" ? "#dc2626" : colors.background,
              borderColor: myVote === "not_useful" ? "#dc2626" : colors.border,
              opacity: hasVoted && myVote !== "not_useful" ? 0.45 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather
            name="thumbs-down"
            size={16}
            color={myVote === "not_useful" ? "#fff" : "#dc2626"}
          />
          <Text
            style={[
              styles.btnText,
              { color: myVote === "not_useful" ? "#fff" : colors.foreground },
            ]}
          >
            {isFr ? "Pas utile" : "Not useful"}
          </Text>
        </Pressable>

        {voting ? <ActivityIndicator size="small" color={accent} /> : null}
      </View>

      {hasVoted ? (
        <Text style={[styles.thanks, { color: colors.mutedForeground }]}>
          {isFr ? "Merci pour votre retour !" : "Thanks for your feedback!"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    flex: 1,
  },
  aggregateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  aggSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  thanks: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});
