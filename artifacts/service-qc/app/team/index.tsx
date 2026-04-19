import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getApiBaseUrl } from "@/lib/apiBase";
import { authedFetch } from "@/lib/apiClient";

type Member = {
  id: string;
  userId: string | null;
  invitedEmail: string;
  role: "owner" | "admin" | "member";
  status: "invited" | "active" | "revoked";
  invitedAt: string;
  joinedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type TeamPayload = {
  organisation: { id: string; name: string; kind: string } | null;
  plan: string | null;
  planStatus: string | null;
  myRole: "owner" | "admin" | "member";
  seatLimit: number;
  seatsActive: number;
  seatsInvited: number;
  canInvite: boolean;
  members: Member[];
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  invited: "Invitation envoyée",
  revoked: "Révoqué",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: "#dcfce7", fg: "#166534" },
  invited: { bg: "#fef3c7", fg: "#92400e" },
  revoked: { bg: "#e5e7eb", fg: "#374151" },
};

export default function TeamScreen() {
  const router = useRouter();
  const [data, setData] = useState<TeamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await authedFetch(`${getApiBaseUrl()}/api/organisations/me/members`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Erreur de chargement");
      }
      const j = (await r.json()) as TeamPayload;
      setData(j);
    } catch (e: any) {
      setError(e.message ?? "Erreur");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitInvite() {
    if (!inviteEmail.trim()) {
      Alert.alert("Email requis");
      return;
    }
    setSubmitting(true);
    try {
      const r = await authedFetch(`${getApiBaseUrl()}/api/organisations/me/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const j = await r.json();
      if (!r.ok) {
        Alert.alert("Impossible d'inviter", j.error ?? "Erreur");
        return;
      }
      setInviteEmail("");
      setInviteRole("member");
      setInviteOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  function confirmRevoke(m: Member) {
    Alert.alert(
      "Révoquer ce siège ?",
      `${m.invitedEmail} perdra l'accès aux dossiers et aux RDV.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Révoquer",
          style: "destructive",
          onPress: async () => {
            const r = await authedFetch(
              `${getApiBaseUrl()}/api/organisations/me/members/${m.id}`,
              { method: "DELETE" },
            );
            if (r.ok) load();
            else Alert.alert("Erreur", "Révocation impossible.");
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#991b1b", textAlign: "center", marginBottom: 12 }}>
          {error ?? "Erreur"}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnSecondary}>
          <Text>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seatsUsed = data.seatsActive + data.seatsInvited;
  const planLabel = data.plan
    ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    : "Aucun forfait";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Équipe",
          headerStyle: { backgroundColor: "#1e40af" },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        <View style={styles.card}>
          <Text style={styles.orgName}>{data.organisation?.name ?? "Mon organisation"}</Text>
          <Text style={styles.planLine}>
            Forfait : <Text style={{ fontWeight: "600" }}>{planLabel}</Text>
            {data.planStatus ? `  •  ${data.planStatus}` : ""}
          </Text>
          <View style={styles.seatsBar}>
            <Text style={styles.seatsText}>
              Sièges utilisés : {seatsUsed} / {data.seatLimit}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(100, (seatsUsed / data.seatLimit) * 100)}%`,
                    backgroundColor: seatsUsed >= data.seatLimit ? "#dc2626" : "#1e40af",
                  },
                ]}
              />
            </View>
          </View>

          {data.canInvite ? (
            <TouchableOpacity
              style={[styles.btnPrimary, seatsUsed >= data.seatLimit && { opacity: 0.4 }]}
              disabled={seatsUsed >= data.seatLimit}
              onPress={() => setInviteOpen(true)}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Inviter un coéquipier</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.notice}>
              <Ionicons name="information-circle" size={18} color="#92400e" />
              <Text style={styles.noticeText}>
                {data.plan === "terrain"
                  ? "Le forfait Terrain est mono-utilisateur. Passez à Organisme ou Institution pour inviter une équipe."
                  : "Seuls les propriétaires et administrateurs peuvent inviter."}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Membres ({data.members.length})</Text>
        {data.members.map((m) => {
          const sc = STATUS_COLORS[m.status];
          const displayName =
            m.firstName || m.lastName
              ? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()
              : m.email ?? m.invitedEmail;
          const canRevoke =
            (data.myRole === "owner" || data.myRole === "admin") && m.role !== "owner";
          return (
            <View key={m.id} style={styles.memberCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{displayName}</Text>
                <Text style={styles.memberEmail}>{m.invitedEmail}</Text>
                <View style={styles.chipsRow}>
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{ROLE_LABEL[m.role]}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusChipText, { color: sc.fg }]}>
                      {STATUS_LABEL[m.status]}
                    </Text>
                  </View>
                </View>
              </View>
              {canRevoke && (
                <TouchableOpacity onPress={() => confirmRevoke(m)} style={styles.revokeBtn}>
                  <Ionicons name="close-circle" size={22} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={inviteOpen} animationType="slide" transparent onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inviter un coéquipier</Text>
            <Text style={styles.modalLabel}>Adresse courriel</Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="prenom.nom@exemple.org"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text style={styles.modalLabel}>Rôle</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["member", "admin"] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setInviteRole(r)}
                  style={[
                    styles.roleSelect,
                    inviteRole === r && { backgroundColor: "#1e40af", borderColor: "#1e40af" },
                  ]}
                >
                  <Text style={{ color: inviteRole === r ? "#fff" : "#374151", fontWeight: "600" }}>
                    {ROLE_LABEL[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalHint}>
              La personne aura accès aux dossiers clients et à l'agenda partagés de l'organisation
              dès qu'elle se connectera avec ce courriel.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btnSecondary, { flex: 1 }]}
                onPress={() => setInviteOpen(false)}
                disabled={submitting}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={submitInvite}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Envoyer l'invitation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  orgName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  planLine: { color: "#6b7280", marginTop: 4 },
  seatsBar: { marginTop: 12, marginBottom: 12 },
  seatsText: { color: "#374151", marginBottom: 6, fontWeight: "500" },
  barTrack: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  btnPrimary: {
    backgroundColor: "#1e40af",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
  btnSecondary: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  notice: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
  },
  noticeText: { color: "#92400e", flex: 1, fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#374151", marginBottom: 8, marginTop: 4 },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  memberName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  memberEmail: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  roleChip: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleChipText: { color: "#3730a3", fontSize: 12, fontWeight: "600" },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  revokeBtn: { padding: 6 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111827" },
  modalLabel: { fontSize: 13, color: "#374151", fontWeight: "600", marginTop: 8, marginBottom: 6 },
  modalHint: { fontSize: 12, color: "#6b7280", marginTop: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  roleSelect: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
});
