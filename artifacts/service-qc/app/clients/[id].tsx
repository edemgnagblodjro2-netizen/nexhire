import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiBase";

const AUTH_TOKEN_KEY = "auth_session_token";

type Client = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  dateOfBirth: string | null;
  summary: string | null;
  riskLevel: "none" | "low" | "medium" | "high";
  updatedAt: string;
  createdAt: string;
};

type Note = {
  id: string;
  content: string;
  kind: "note" | "contact" | "rdv" | "refer" | "alerte";
  createdAt: string;
};

const KIND_META: Record<Note["kind"], { color: string; icon: any; label: string }> = {
  note: { color: "#64748b", icon: "edit-3", label: "Note" },
  contact: { color: "#0284c7", icon: "phone", label: "Contact" },
  rdv: { color: "#0e7e6e", icon: "calendar", label: "Rendez-vous" },
  refer: { color: "#7c3aed", icon: "share-2", label: "Référence" },
  alerte: { color: "#dc2626", icon: "alert-triangle", label: "Alerte" },
};

const RISK_OPTIONS: Array<{ value: Client["riskLevel"]; label: string; color: string }> = [
  { value: "none", label: "Standard", color: "#64748b" },
  { value: "low", label: "Faible", color: "#0e7e6e" },
  { value: "medium", label: "Modéré", color: "#d97706" },
  { value: "high", label: "Élevé", color: "#dc2626" },
];

async function authedFetch(url: string, init?: RequestInit) {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [noteKind, setNoteKind] = useState<Note["kind"]>("note");
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authedFetch(`${getApiBaseUrl()}/api/clients/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setClient(data.client);
      setNotes(data.notes || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function handleAddNote() {
    if (!noteText.trim() || !id) return;
    setSavingNote(true);
    try {
      const res = await authedFetch(`${getApiBaseUrl()}/api/clients/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: noteText.trim(), kind: noteKind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setNotes((prev) => [data.note, ...prev]);
      setNoteText("");
      setNoteKind("note");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Note non enregistrée", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleUpdateRisk(level: Client["riskLevel"]) {
    if (!client) return;
    Haptics.selectionAsync();
    setClient({ ...client, riskLevel: level });
    try {
      const res = await authedFetch(`${getApiBaseUrl()}/api/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({ riskLevel: level }),
      });
      if (!res.ok) throw new Error();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le niveau.");
      load();
    }
  }

  async function handleArchive() {
    if (!client) return;
    Alert.alert(
      "Archiver ce dossier ?",
      "Le dossier ne sera plus affiché dans la liste mais reste consultable. Cette action est réversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Archiver",
          style: "destructive",
          onPress: async () => {
            await authedFetch(`${getApiBaseUrl()}/api/clients/${client.id}`, { method: "DELETE" });
            router.back();
          },
        },
      ],
    );
  }

  function handleCall() {
    if (!client?.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${client.phone}`);
  }

  async function handleShare() {
    if (!client) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fullName = `${client.firstName}${client.lastName ? ` ${client.lastName}` : ""}`;
    const lastNote = notes[0]?.content ? `\n\nDernière note : ${notes[0].content.slice(0, 240)}` : "";
    const message = `Référence — ${fullName}${client.phone ? `\nTéléphone : ${client.phone}` : ""}${client.summary ? `\nSituation : ${client.summary}` : ""}${lastNote}\n\n— Envoyé via AttenteZéro Terrain`;
    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color="#0284c7" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !client) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color="#dc2626" />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Dossier introuvable
          </Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${client.firstName}${client.lastName ? ` ${client.lastName}` : ""}`;
  const initials = `${client.firstName.slice(0, 1).toUpperCase()}${client.lastName?.slice(0, 1).toUpperCase() ?? ""}`;
  const currentRisk = RISK_OPTIONS.find((r) => r.value === client.riskLevel)!;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <Header onBack={() => router.back()} onArchive={handleArchive} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile */}
          <View style={styles.profileWrap}>
            <View style={[styles.bigAvatar, { backgroundColor: currentRisk.color + "22" }]}>
              <Text style={[styles.bigAvatarText, { color: currentRisk.color }]}>{initials}</Text>
            </View>
            <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={2}>
              {fullName}
            </Text>
            {client.phone || client.city ? (
              <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
                {[client.phone, client.city].filter(Boolean).join(" · ")}
              </Text>
            ) : null}

            <View style={styles.actionRow}>
              {client.phone && (
                <Pressable style={[styles.actionBtn, { backgroundColor: "#0e7e6e" }]} onPress={handleCall}>
                  <Feather name="phone" size={15} color="#fff" />
                  <Text style={styles.actionBtnText}>Appeler</Text>
                </Pressable>
              )}
              <Pressable style={[styles.actionBtn, { backgroundColor: "#7c3aed" }]} onPress={handleShare}>
                <Feather name="share-2" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Partager / Référer</Text>
              </Pressable>
            </View>
          </View>

          {/* Risk selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Niveau de risque</Text>
            <View style={styles.riskRow}>
              {RISK_OPTIONS.map((r) => {
                const active = client.riskLevel === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => handleUpdateRisk(r.value)}
                    style={[
                      styles.riskChip,
                      {
                        backgroundColor: active ? r.color : colors.card,
                        borderColor: active ? r.color : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskChipText,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Summary */}
          {client.summary ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.mutedForeground }]}>Situation</Text>
              <Text style={[styles.summaryText, { color: colors.foreground }]}>{client.summary}</Text>
            </View>
          ) : null}

          {/* Add note */}
          <View style={[styles.noteAddCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nouvelle note</Text>
            <View style={styles.kindRow}>
              {(Object.keys(KIND_META) as Note["kind"][]).map((k) => {
                const meta = KIND_META[k];
                const active = noteKind === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNoteKind(k);
                    }}
                    style={[
                      styles.kindChip,
                      {
                        backgroundColor: active ? meta.color : colors.background,
                        borderColor: active ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <Feather name={meta.icon} size={12} color={active ? "#fff" : meta.color} />
                    <Text
                      style={[
                        styles.kindChipText,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Décrivez le contact, le rendez-vous, l'observation…"
              placeholderTextColor={colors.mutedForeground}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <Pressable
              onPress={handleAddNote}
              disabled={!noteText.trim() || savingNote}
              style={[
                styles.saveBtn,
                { opacity: !noteText.trim() || savingNote ? 0.5 : 1 },
              ]}
            >
              {savingNote ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.saveBtnText}>Ajouter au journal</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Notes timeline */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Journal de suivi · {notes.length}
            </Text>
            {notes.length === 0 ? (
              <Text style={[styles.emptyNotes, { color: colors.mutedForeground }]}>
                Aucune note pour le moment.
              </Text>
            ) : (
              notes.map((n) => {
                const meta = KIND_META[n.kind];
                const date = new Date(n.createdAt);
                const dateStr = date.toLocaleDateString("fr-CA", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <View
                    key={n.id}
                    style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.noteHead}>
                      <View style={[styles.kindDot, { backgroundColor: meta.color }]}>
                        <Feather name={meta.icon} size={11} color="#fff" />
                      </View>
                      <Text style={[styles.noteKind, { color: meta.color }]}>{meta.label}</Text>
                      <Text style={[styles.noteDate, { color: colors.mutedForeground }]}>{dateStr}</Text>
                    </View>
                    <Text style={[styles.noteText, { color: colors.foreground }]}>{n.content}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  onArchive,
}: {
  onBack: () => void;
  onArchive?: () => void;
}) {
  return (
    <LinearGradient colors={["#0c4a6e", "#0284c7"]} style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Dossier client</Text>
      {onArchive ? (
        <Pressable onPress={onArchive} hitSlop={12} style={styles.backBtn}>
          <Feather name="archive" size={18} color="#fff" />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
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
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  errorTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  errorSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  profileWrap: { alignItems: "center", padding: 20, gap: 8 },
  bigAvatar: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  profileMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },

  section: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },

  riskRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  riskChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  riskChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  summaryTitle: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  noteAddCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kindChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noteInput: {
    minHeight: 80,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0284c7",
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },

  emptyNotes: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },

  noteCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  noteHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  noteKind: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  noteDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noteText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
