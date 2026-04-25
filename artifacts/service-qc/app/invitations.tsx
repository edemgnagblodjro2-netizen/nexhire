import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authedFetch } from "@/lib/apiClient";

type PendingInvite = {
  id: string;
  role: "owner" | "admin" | "member";
  invitedAt: string;
  invitedEmail: string;
  orgId: string | null;
  orgName: string | null;
  orgKind: string | null;
  inviterFirstName: string | null;
  inviterLastName: string | null;
  inviterEmail: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

export default function InvitationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-invite local state for the decline note + busy flag
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await authedFetch(`/api/invitations/pending`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Erreur de chargement");
      }
      const j = (await r.json()) as { invitations: PendingInvite[] };
      setItems(j.invitations || []);
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (
    inv: PendingInvite,
    action: "accept" | "decline",
  ) => {
    if (submitting) return;
    const note = (notes[inv.id] ?? "").trim();
    if (action === "decline" && !note) {
      Alert.alert(
        "Note requise",
        "Veuillez indiquer brièvement votre disponibilité avant de refuser (par ex. « disponible à partir du 15 mai »).",
      );
      return;
    }
    setSubmitting(inv.id);
    try {
      const r = await authedFetch(`/api/invitations/${inv.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Erreur");
      // Remove from list
      setItems((prev) => prev.filter((x) => x.id !== inv.id));
      Alert.alert(
        action === "accept" ? "Invitation acceptée" : "Invitation refusée",
        action === "accept"
          ? `Vous êtes maintenant membre de ${inv.orgName ?? "l'organisation"}.`
          : "L'administrateur a été notifié avec votre note.",
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de répondre.");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mes invitations" }} />
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mes invitations" }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="mail-open-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucune invitation en attente</Text>
            <Text style={styles.emptyText}>
              Lorsqu'un organisme vous invitera à rejoindre son équipe,
              l'invitation apparaîtra ici.
            </Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((inv) => {
            const inviterName =
              inv.inviterFirstName || inv.inviterLastName
                ? `${inv.inviterFirstName ?? ""} ${inv.inviterLastName ?? ""}`.trim()
                : inv.inviterEmail ?? "Un administrateur";
            const busy = submitting === inv.id;
            return (
              <View key={inv.id} style={styles.card}>
                <Text style={styles.orgName}>
                  {inv.orgName ?? "Organisation"}
                </Text>
                <Text style={styles.inviter}>
                  Invitation de {inviterName}
                </Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>
                    Rôle proposé : {ROLE_LABEL[inv.role] ?? inv.role}
                  </Text>
                </View>

                <Text style={styles.label}>
                  Note de disponibilité (obligatoire si vous refusez)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex. : Disponible à partir du 15 mai, ou refus définitif"
                  placeholderTextColor="#9ca3af"
                  value={notes[inv.id] ?? ""}
                  onChangeText={(t) =>
                    setNotes((prev) => ({ ...prev, [inv.id]: t }))
                  }
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  editable={!busy}
                />

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.declineBtn]}
                    onPress={() => respond(inv, "decline")}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#991b1b" />
                    ) : (
                      <>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#991b1b"
                        />
                        <Text style={styles.declineText}>Refuser</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.acceptBtn]}
                    onPress={() => respond(inv, "accept")}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.acceptText}>Accepter</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: "#991b1b", fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#e0e7ff",
  },
  backBtnText: { color: "#3730a3", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },
  orgName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  inviter: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  roleChip: {
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleChipText: { color: "#3730a3", fontSize: 12, fontWeight: "600" },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#111827",
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: "#f9fafb",
  },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  declineBtn: { backgroundColor: "#fee2e2" },
  declineText: { color: "#991b1b", fontWeight: "700" },
  acceptBtn: { backgroundColor: "#16a34a" },
  acceptText: { color: "#fff", fontWeight: "700" },
});
