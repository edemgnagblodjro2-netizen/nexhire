import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { authedFetch } from "@/lib/apiClient";

import { useColors } from "@/hooks/useColors";

type Appointment = {
  id: string;
  clientId: string;
  scheduledAt: string;
  durationMin: number;
  location: string | null;
  notes: string | null;
  status: "scheduled" | "confirmed" | "done" | "cancelled" | "noshow";
  clientFirstName: string | null;
  clientLastName: string | null;
  clientPhone: string | null;
};

const STATUS_META: Record<Appointment["status"], { color: string; label: string; icon: any }> = {
  scheduled: { color: "#0284c7", label: "Planifié", icon: "clock" },
  confirmed: { color: "#0e7e6e", label: "Confirmé", icon: "check-circle" },
  done: { color: "#64748b", label: "Terminé", icon: "check" },
  cancelled: { color: "#94a3b8", label: "Annulé", icon: "x-circle" },
  noshow: { color: "#dc2626", label: "Absent", icon: "alert-circle" },
};

type Tab = "today" | "upcoming" | "past";


export default function AgendaScreen() {
  const router = useRouter();
  const colors = useColors();

  const [tab, setTab] = useState<Tab>("today");
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const range = useMemo(() => {
    // Calendar-safe day boundaries — DST-safe, unlike +24h ms arithmetic.
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (tab === "today") return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    if (tab === "upcoming") {
      const tomorrow = new Date(startOfDay);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const in60d = new Date(startOfDay);
      in60d.setDate(in60d.getDate() + 60);
      return { from: tomorrow.toISOString(), to: in60d.toISOString() };
    }
    // past — last 60 days, before today
    const start60dAgo = new Date(startOfDay);
    start60dAgo.setDate(start60dAgo.getDate() - 60);
    return { from: start60dAgo.toISOString(), to: startOfDay.toISOString() };
  }, [tab]);

  const load = useCallback(async () => {
    try {
      const url = `/api/appointments?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
      const res = await authedFetch(url);
      if (res.status === 403) {
        setAccessDenied(true);
        setItems([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setItems(data.appointments || []);
      setAccessDenied(false);
    } catch (e) {
      // soft fail; banner shown via empty state
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function handleStatusChange(apt: Appointment, status: Appointment["status"]) {
    Haptics.selectionAsync();
    setItems((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status } : a)));
    try {
      await authedFetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch {
      load();
    }
  }

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of items) {
      const d = new Date(apt.scheduledAt);
      const key = d.toLocaleDateString("fr-CA", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(apt);
    }
    return Array.from(map.entries());
  }, [items]);

  if (accessDenied) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.gateWrap}>
          <LinearGradient colors={["#0c4a6e", "#0284c7"]} style={styles.gateCard}>
            <Feather name="lock" size={28} color="#fff" />
            <Text style={styles.gateTitle}>Agenda réservé aux abonnés</Text>
            <Text style={styles.gateText}>
              Le calendrier des rendez-vous est inclus avec l'abonnement Terrain (19 $/mois) et Institution (199 $/mois).
              Les deux incluent 14 jours d'essai gratuit.
            </Text>
            <Pressable onPress={() => router.push("/premium" as any)} style={styles.gateBtn}>
              <Feather name="zap" size={15} color="#0284c7" />
              <Text style={styles.gateBtnText}>Voir les abonnements</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <Header onBack={() => router.back()} />

      {/* Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(["today", "upcoming", "past"] as Tab[]).map((t) => {
          const active = tab === t;
          const label = t === "today" ? "Aujourd'hui" : t === "upcoming" ? "À venir" : "Passé";
          return (
            <Pressable
              key={t}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t);
              }}
              style={[styles.tabBtn, active && { backgroundColor: "#0284c7" }]}
            >
              <Text style={[styles.tabText, { color: active ? "#fff" : colors.foreground }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0284c7" />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0284c7" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Feather name="calendar" size={42} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tab === "today"
                ? "Aucun rendez-vous aujourd'hui"
                : tab === "upcoming"
                ? "Aucun rendez-vous à venir"
                : "Aucun rendez-vous passé"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Planifiez un RDV depuis la fiche d'un client.
            </Text>
            <Pressable
              onPress={() => router.push("/clients" as any)}
              style={styles.emptyBtn}
            >
              <Feather name="users" size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Voir les dossiers clients</Text>
            </Pressable>
          </View>
        ) : (
          groups.map(([dateLabel, list]) => (
            <View key={dateLabel} style={{ marginTop: 14 }}>
              <Text style={[styles.dayHeader, { color: colors.mutedForeground }]}>
                {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
              </Text>
              {list.map((apt) => {
                const meta = STATUS_META[apt.status];
                const fullName = `${apt.clientFirstName ?? ""}${apt.clientLastName ? ` ${apt.clientLastName}` : ""}`.trim() || "Client";
                const time = new Date(apt.scheduledAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
                return (
                  <Pressable
                    key={apt.id}
                    onPress={() => router.push({ pathname: "/clients/[id]", params: { id: apt.clientId } })}
                    style={({ pressed }) => [
                      styles.aptCard,
                      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={[styles.timeCol, { backgroundColor: meta.color + "18" }]}>
                      <Text style={[styles.timeText, { color: meta.color }]}>{time}</Text>
                      <Text style={[styles.durText, { color: meta.color }]}>{apt.durationMin}min</Text>
                    </View>
                    <View style={styles.aptMain}>
                      <Text style={[styles.aptName, { color: colors.foreground }]} numberOfLines={1}>
                        {fullName}
                      </Text>
                      {apt.location ? (
                        <View style={styles.aptMetaLine}>
                          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                          <Text style={[styles.aptMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {apt.location}
                          </Text>
                        </View>
                      ) : null}
                      {apt.notes ? (
                        <Text style={[styles.aptNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {apt.notes}
                        </Text>
                      ) : null}
                      <View style={styles.statusRow}>
                        {(["confirmed", "done", "cancelled", "noshow"] as Appointment["status"][]).map((s) => {
                          const sm = STATUS_META[s];
                          const active = apt.status === s;
                          return (
                            <Pressable
                              key={s}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleStatusChange(apt, s);
                              }}
                              style={[
                                styles.statusChip,
                                {
                                  backgroundColor: active ? sm.color : "transparent",
                                  borderColor: sm.color,
                                },
                              ]}
                            >
                              <Feather
                                name={sm.icon}
                                size={10}
                                color={active ? "#fff" : sm.color}
                              />
                              <Text
                                style={[
                                  styles.statusChipText,
                                  { color: active ? "#fff" : sm.color },
                                ]}
                              >
                                {sm.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={["#0c4a6e", "#0284c7"]} style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Agenda — Rendez-vous</Text>
        <Text style={styles.headerSub}>Mode Terrain</Text>
      </View>
      <View style={styles.headerBadge}>
        <Feather name="calendar" size={11} color="#fff" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_400Regular" },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  tabsWrap: {
    flexDirection: "row",
    margin: 12,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  emptyBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },

  dayHeader: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginLeft: 4,
    marginBottom: 6,
  },
  aptCard: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  timeCol: {
    width: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  timeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  durText: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },

  aptMain: { flex: 1, gap: 4 },
  aptName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  aptMetaLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  aptMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aptNotes: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  /* Gate */
  gateWrap: { flex: 1, padding: 16, justifyContent: "center" },
  gateCard: { padding: 24, borderRadius: 18, gap: 12, alignItems: "flex-start" },
  gateTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  gateText: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  gateBtnText: { color: "#0284c7", fontSize: 14, fontFamily: "Inter_700Bold" },
});
