import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { authedFetch } from "@/lib/apiClient";
import { usePlanGate } from "@/hooks/usePlanGate";
import PlanLimitModal from "@/components/PlanLimitModal";

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  city: string | null;
  summary: string | null;
  riskLevel: "none" | "low" | "medium" | "high";
  status: "en_attente" | "en_cours" | "en_pause" | "termine";
  updatedAt: string;
};

const RISK_META: Record<ClientRow["riskLevel"], { color: string; label: string }> = {
  none: { color: "#64748b", label: "Standard" },
  low: { color: "#0e7e6e", label: "Faible" },
  medium: { color: "#d97706", label: "Modéré" },
  high: { color: "#dc2626", label: "Élevé" },
};

const STATUS_META: Record<ClientRow["status"], { color: string; label: string }> = {
  en_attente: { color: "#94a3b8", label: "En attente" },
  en_cours: { color: "#0284c7", label: "En cours" },
  en_pause: { color: "#d97706", label: "En pause" },
  termine: { color: "#0e7e6e", label: "Terminé" },
};


export default function ClientsListScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [creating, setCreating] = useState(false);

  const gate = usePlanGate();

  function tryOpenCreate() {
    if (!gate.canCreateClient(clients.length)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowLimit(true);
      return;
    }
    setShowCreate(true);
  }

  const load = useCallback(
    async (q?: string) => {
      try {
        const url = `/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await authedFetch(url);
        if (res.status === 403) {
          setAccessDenied(true);
          setClients([]);
          return;
        }
        if (res.status === 401) {
          setError("Connectez-vous pour accéder à vos dossiers.");
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de chargement");
        setClients(data.clients || []);
        setAccessDenied(false);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      setLoading(true);
      load(query.trim() || undefined);
    }, [isAuthenticated, load, query]),
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (isAuthenticated) load(query.trim() || undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [query, isAuthenticated, load]);

  async function handleCreate() {
    if (!newFirst.trim()) {
      Alert.alert("Prénom requis", "Le prénom du client est obligatoire.");
      return;
    }
    setCreating(true);
    try {
      const res = await authedFetch(`/api/clients`, {
        method: "POST",
        body: JSON.stringify({
          firstName: newFirst.trim(),
          lastName: newLast.trim() || null,
          phone: newPhone.trim() || null,
          summary: newSummary.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setNewFirst("");
      setNewLast("");
      setNewPhone("");
      setNewSummary("");
      router.push({ pathname: "/clients/[id]", params: { id: data.client.id } });
      load();
    } catch (e) {
      Alert.alert("Création impossible", e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  const headerSubtitle = useMemo(() => {
    if (loading) return "Chargement…";
    return `${clients.length} dossier${clients.length === 1 ? "" : "s"} actif${clients.length === 1 ? "" : "s"}`;
  }, [loading, clients.length]);

  // ── Access denied state ────────────────────────────────────
  if (accessDenied) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.gateWrap}>
          <LinearGradient
            colors={["#0c4a6e", "#0284c7"]}
            style={styles.gateCard}
          >
            <Feather name="lock" size={28} color="#fff" />
            <Text style={styles.gateTitle}>Mode Terrain réservé aux abonnés</Text>
            <Text style={styles.gateText}>
              Cette section est disponible avec l'abonnement Travailleur (19 $/mois), Organisme (39 $/mois), Plus (89 $/mois) ou Institution (199 $/mois).
              Les deux incluent 14 jours d'essai gratuit, sans carte requise.
            </Text>
            <Pressable
              onPress={() => router.push("/premium" as any)}
              style={styles.gateBtn}
            >
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
      <Header onBack={() => router.back()} subtitle={headerSubtitle} />

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher par nom ou téléphone…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={14} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && clients.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0284c7" />
        </View>
      ) : clients.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={42} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query ? "Aucun résultat" : "Aucun dossier client"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {query
              ? "Essayez un autre nom ou numéro."
              : "Appuyez sur le bouton « Nouveau dossier » pour commencer."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(query.trim() || undefined);
              }}
              tintColor="#0284c7"
            />
          }
          renderItem={({ item }) => {
            const risk = RISK_META[item.riskLevel];
            const status = STATUS_META[item.status] ?? STATUS_META.en_cours;
            const fullName = `${item.firstName}${item.lastName ? ` ${item.lastName}` : ""}`;
            return (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: "/clients/[id]", params: { id: item.id } });
                }}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: risk.color + "22" }]}>
                  <Text style={[styles.avatarText, { color: risk.color }]}>
                    {item.firstName.slice(0, 1).toUpperCase()}
                    {item.lastName?.slice(0, 1).toUpperCase() ?? ""}
                  </Text>
                </View>
                <View style={styles.rowMain}>
                  <View style={styles.rowTitleLine}>
                    <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                      {fullName}
                    </Text>
                    {item.riskLevel !== "none" && (
                      <View style={[styles.riskPill, { backgroundColor: risk.color + "18" }]}>
                        <Text style={[styles.riskPillText, { color: risk.color }]}>{risk.label}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowMetaLine}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.rowStatus, { color: status.color }]}>{status.label}</Text>
                    {(item.phone || item.city || item.summary) && (
                      <Text
                        style={[styles.rowMeta, { color: colors.mutedForeground, flex: 1 }]}
                        numberOfLines={1}
                      >
                        · {item.phone || item.city || item.summary}
                      </Text>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          tryOpenCreate();
        }}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
      >
        <LinearGradient
          colors={["#0284c7", "#0c4a6e"]}
          style={styles.fabGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.fabText}>Nouveau dossier</Text>
        </LinearGradient>
      </Pressable>

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreate(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouveau dossier client</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Confidentiel — visible uniquement par votre organisme.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Prénom *"
              placeholderTextColor={colors.mutedForeground}
              value={newFirst}
              onChangeText={setNewFirst}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Nom de famille (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              value={newLast}
              onChangeText={setNewLast}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Téléphone (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.inputMulti, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Résumé / situation actuelle (optionnel)"
              placeholderTextColor={colors.mutedForeground}
              value={newSummary}
              onChangeText={setNewSummary}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCreate(false)}
                style={[styles.modalBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={creating}
                style={[styles.modalBtn, styles.modalBtnPrimary]}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Créer le dossier</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PlanLimitModal
        visible={showLimit}
        onDismiss={() => setShowLimit(false)}
        currentPlanId={gate.planId}
        upgradePlanId={gate.upgradePlanId}
        limitKind="clients"
        limitValue={gate.plan.features.maxClients}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, subtitle }: { onBack: () => void; subtitle?: string }) {
  return (
    <LinearGradient colors={["#0c4a6e", "#0284c7"]} style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Mode Terrain — Dossiers clients
        </Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerBadge}>
        <Feather name="shield" size={11} color="#fff" />
        <Text style={styles.headerBadgeText}>Privé</Text>
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
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  errorText: { color: "#dc2626", fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rowMain: { flex: 1, gap: 3 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  rowMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rowMetaLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  rowStatus: { fontSize: 11, fontFamily: "Inter_700Bold" },
  riskPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fabText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },

  /* Modal */
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  inputMulti: { height: 90, paddingTop: 10, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalBtnPrimary: { backgroundColor: "#0284c7" },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  /* Gate */
  gateWrap: { flex: 1, padding: 16, justifyContent: "center" },
  gateCard: {
    padding: 24,
    borderRadius: 18,
    gap: 12,
    alignItems: "flex-start",
  },
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
