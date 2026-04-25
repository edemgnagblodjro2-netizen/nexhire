import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { authedFetch } from "@/lib/apiClient";
import { useColors } from "@/hooks/useColors";

type Activity = {
  id: string;
  clientId: string;
  kind:
    | "created"
    | "status_changed"
    | "risk_changed"
    | "note_added"
    | "archived"
    | "unarchived";
  detail: string | null;
  createdAt: string;
  actorUserId: string;
  actorFirstName: string | null;
  actorLastName: string | null;
  actorEmail: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
};

const RISK_LABELS: Record<string, string> = {
  none: "Standard",
  low: "Faible",
  medium: "Modéré",
  high: "Élevé",
};

const KIND_META: Record<
  Activity["kind"],
  { color: string; icon: any; verb: string }
> = {
  created: { color: "#0e7e6e", icon: "user-plus", verb: "a créé" },
  status_changed: { color: "#0284c7", icon: "refresh-cw", verb: "a changé le statut de" },
  risk_changed: { color: "#d97706", icon: "alert-triangle", verb: "a ajusté le risque de" },
  note_added: { color: "#7c3aed", icon: "edit-3", verb: "a ajouté une note à" },
  archived: { color: "#64748b", icon: "archive", verb: "a archivé" },
  unarchived: { color: "#64748b", icon: "rotate-ccw", verb: "a réactivé" },
};

function formatDetail(kind: Activity["kind"], detail: string | null): string | null {
  if (!detail) return null;
  if (kind === "status_changed") {
    const [from, to] = detail.split("→");
    return `${STATUS_LABELS[from] ?? from} → ${STATUS_LABELS[to] ?? to}`;
  }
  if (kind === "risk_changed") {
    const [from, to] = detail.split("→");
    return `${RISK_LABELS[from] ?? from} → ${RISK_LABELS[to] ?? to}`;
  }
  return detail;
}

function actorName(a: Activity): string {
  const fn = (a.actorFirstName ?? "").trim();
  const ln = (a.actorLastName ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  return a.actorEmail || "Un membre";
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
  });
}

export default function ClientActivitiesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authedFetch("/api/clients/activities");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      setItems(Array.isArray(j.activities) ? j.activities : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Mark feed as seen (resets unread badge) on mount.
  useEffect(() => {
    authedFetch("/api/clients/activities/seen", { method: "POST" }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Fil d'activité de l'équipe
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0284c7" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color="#dc2626" />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="activity" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Aucune activité récente
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Les changements de dossiers de votre équipe apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#0284c7"
            />
          }
          renderItem={({ item }) => {
            const meta = KIND_META[item.kind] ?? KIND_META.note_added;
            const clientName = `${item.clientFirstName ?? ""} ${item.clientLastName ?? ""}`.trim() ||
              "ce dossier";
            const detail = formatDetail(item.kind, item.detail);
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/clients/[id]",
                    params: { id: item.clientId },
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: meta.color + "1f" }]}>
                  <Feather name={meta.icon} size={15} color={meta.color} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.line, { color: colors.foreground }]} numberOfLines={2}>
                    <Text style={{ fontFamily: "Inter_700Bold" }}>{actorName(item)}</Text>
                    <Text> {meta.verb} </Text>
                    <Text style={{ fontFamily: "Inter_700Bold" }}>{clientName}</Text>
                  </Text>
                  {detail ? (
                    <Text
                      style={[styles.detail, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {detail}
                    </Text>
                  ) : null}
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 3 },
  line: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  detail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  time: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
});
