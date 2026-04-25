import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiBase";

// "Combien d'attente?" widget — shows the rolling 2h median wait reported by
// other citizens at this service, and lets the current user contribute a new
// report in a single tap. Designed to be embedded between the hours card and
// the call/website action buttons on the service detail screen.

const PRESET_MINUTES: number[] = [5, 15, 30, 45, 60, 90, 120];

type WaitStats = {
  serviceId: string;
  windowMinutes: number;
  minReports: number;
  sampleCount: number;
  medianMinutes: number | null;
  lastReportedAt: string | null;
};

type Status = "idle" | "loading" | "submitting" | "sent" | "rate-limited" | "error";

const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;
const SENT_TOAST_MS = 6000;

function freshnessLabel(
  iso: string | null,
  t: { waitFreshJustNow: string; waitFreshMinutes: string; waitFreshHours: string },
): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return t.waitFreshJustNow;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return t.waitFreshMinutes.replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  return t.waitFreshHours.replace("{n}", String(hours));
}

export default function WaitTimeWidget({
  serviceId,
  accentColor,
}: {
  serviceId: string;
  accentColor: string;
}) {
  const colors = useColors();
  const { t } = useLanguage();

  const [stats, setStats] = useState<WaitStats | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/wait`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WaitStats;
      setStats(json);
      // Don't trample transient UI states (submitting / sent / rate-limited);
      // those are owned by their own timers below.
      setStatus((prev) =>
        prev === "submitting" || prev === "sent" || prev === "rate-limited"
          ? prev
          : "idle",
      );
    } catch {
      setStatus((prev) => (prev === "submitting" ? prev : "error"));
    }
  }, [serviceId]);

  useEffect(() => {
    setStatus("loading");
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Auto-dismiss the "sent" confirmation back to the normal idle layout so the
  // user can see live updates again without losing their place.
  useEffect(() => {
    if (status !== "sent") return;
    const timer = setTimeout(() => setStatus("idle"), SENT_TOAST_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Auto-clear the rate-limit lock-out after the server-side cooldown window so
  // the CTA reappears without forcing the user to navigate away and come back.
  useEffect(() => {
    if (status !== "rate-limited") return;
    const timer = setTimeout(() => {
      setStatus("idle");
      setErrorText(null);
    }, RATE_LIMIT_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const submit = useCallback(
    async (minutes: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStatus("submitting");
      setErrorText(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/wait`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes }),
        });
        if (res.status === 429) {
          setStatus("rate-limited");
          setErrorText(t.waitReportRateLimited);
          setPickerOpen(false);
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setStatus("error");
          setErrorText((j as { error?: string }).error ?? t.waitReportError);
          return;
        }
        const json = (await res.json()) as { sampleCount: number; medianMinutes: number | null };
        setStats((prev) =>
          prev
            ? { ...prev, sampleCount: json.sampleCount, medianMinutes: json.medianMinutes, lastReportedAt: new Date().toISOString() }
            : prev,
        );
        setStatus("sent");
        setPickerOpen(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setStatus("error");
        setErrorText(t.waitReportError);
      }
    },
    [serviceId, t.waitReportError, t.waitReportRateLimited],
  );

  const fresh = useMemo(
    () => freshnessLabel(stats?.lastReportedAt ?? null, t),
    [stats?.lastReportedAt, t],
  );

  const sampleLabel = useMemo(() => {
    if (!stats) return "";
    return stats.sampleCount === 1 ? t.waitSampleOne : t.waitSampleMany;
  }, [stats, t.waitSampleMany, t.waitSampleOne]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accentColor },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconBubble, { backgroundColor: accentColor + "18" }]}>
          <Feather name="clock" size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.waitTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.waitSubtitle}</Text>
        </View>
      </View>

      {status === "loading" && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={accentColor} />
        </View>
      )}

      {status !== "loading" && stats && stats.medianMinutes != null && (
        <View style={styles.statBlock}>
          <View style={styles.medianRow}>
            <Text style={[styles.medianValue, { color: accentColor }]}>{stats.medianMinutes}</Text>
            <Text style={[styles.medianLabel, { color: colors.mutedForeground }]}>{t.waitMedian}</Text>
          </View>
          <Text style={[styles.metaLine, { color: colors.mutedForeground }]}>
            {stats.sampleCount} {sampleLabel}
            {fresh ? ` · ${fresh}` : ""}
          </Text>
        </View>
      )}

      {status !== "loading" && stats && stats.medianMinutes == null && (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t.waitNoData}</Text>
      )}

      {status === "sent" && (
        <View style={[styles.toast, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
          <Feather name="check-circle" size={16} color="#15803d" />
          <Text style={styles.toastText}>{t.waitReportSent}</Text>
        </View>
      )}

      {(status === "rate-limited" || status === "error") && errorText && (
        <View style={[styles.toast, { backgroundColor: "#fef3c7", borderColor: "#fde68a" }]}>
          <Feather name="alert-triangle" size={16} color="#b45309" />
          <Text style={[styles.toastText, { color: "#92400e" }]}>{errorText}</Text>
        </View>
      )}

      {!pickerOpen && status !== "rate-limited" && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setPickerOpen(true);
            setStatus("idle");
            setErrorText(null);
          }}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: accentColor,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.ctaText}>{t.waitReportButton}</Text>
        </Pressable>
      )}

      {pickerOpen && (
        <View style={styles.pickerBlock}>
          <Text style={[styles.pickerPrompt, { color: colors.foreground }]}>
            {t.waitReportPrompt}
          </Text>
          <View style={styles.pickerGrid}>
            {PRESET_MINUTES.map((m) => (
              <Pressable
                key={m}
                onPress={() => submit(m)}
                disabled={status === "submitting"}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: accentColor,
                    backgroundColor: pressed ? accentColor + "22" : "transparent",
                    opacity: status === "submitting" ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: accentColor }]}>{m} min</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              setPickerOpen(false);
              setStatus("idle");
            }}
            style={styles.cancelBtn}
            disabled={status === "submitting"}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
              {status === "submitting" ? t.waitReportSending : t.waitReportCancel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  loadingRow: {
    paddingVertical: 8,
    alignItems: "center",
  },
  statBlock: {
    gap: 4,
  },
  medianRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  medianValue: {
    fontSize: 36,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  medianLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  metaLine: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#15803d",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  pickerBlock: {
    gap: 10,
  },
  pickerPrompt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 19,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
