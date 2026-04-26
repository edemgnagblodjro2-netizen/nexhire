import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { authedFetch } from "@/lib/apiClient";

import { useColors } from "@/hooks/useColors";
import { usePlanGate } from "@/hooks/usePlanGate";
import PlanLimitModal from "@/components/PlanLimitModal";

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
  status: "en_attente" | "en_cours" | "en_pause" | "termine";
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

const STATUS_OPTIONS: Array<{ value: Client["status"]; label: string; color: string; icon: any }> = [
  { value: "en_attente", label: "En attente", color: "#94a3b8", icon: "clock" },
  { value: "en_cours", label: "En cours", color: "#0284c7", icon: "play-circle" },
  { value: "en_pause", label: "En pause", color: "#d97706", icon: "pause-circle" },
  { value: "termine", label: "Terminé", color: "#0e7e6e", icon: "check-circle" },
];

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

  // Schedule appointment modal state
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAptLimit, setShowAptLimit] = useState(false);
  const [monthlyAptCount, setMonthlyAptCount] = useState(0);
  const gate = usePlanGate();

  const loadMonthlyAptCount = useCallback(async () => {
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const r = await authedFetch(
        `/api/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!r.ok) return;
      const j = await r.json();
      setMonthlyAptCount(Array.isArray(j.appointments) ? j.appointments.length : 0);
    } catch {}
  }, []);

  function tryOpenSchedule() {
    if (!gate.canCreateAppointment(monthlyAptCount)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowAptLimit(true);
      return;
    }
    setShowSchedule(true);
  }
  const [aptDateChip, setAptDateChip] = useState<"today" | "tomorrow" | "in2d" | "in7d" | "custom">("tomorrow");
  const [aptCustomDate, setAptCustomDate] = useState(""); // YYYY-MM-DD
  const [aptHour, setAptHour] = useState("14");
  const [aptMinute, setAptMinute] = useState("00");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptLocation, setAptLocation] = useState("");
  const [aptNotes, setAptNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authedFetch(`/api/clients/${id}`);
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
      loadMonthlyAptCount();
    }, [load, loadMonthlyAptCount]),
  );

  async function handleAddNote() {
    if (!noteText.trim() || !id) return;
    setSavingNote(true);
    try {
      const res = await authedFetch(`/api/clients/${id}/notes`, {
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
      const res = await authedFetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({ riskLevel: level }),
      });
      if (!res.ok) throw new Error();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le niveau.");
      load();
    }
  }

  async function handleUpdateStatus(status: Client["status"]) {
    if (!client || client.status === status) return;
    Haptics.selectionAsync();
    setClient({ ...client, status });
    try {
      const res = await authedFetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
      load();
    }
  }

  function computeAptDate(): Date | null {
    // Use calendar-safe arithmetic (setDate) — DST-safe, unlike +24h ms.
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (aptDateChip === "tomorrow") base.setDate(base.getDate() + 1);
    else if (aptDateChip === "in2d") base.setDate(base.getDate() + 2);
    else if (aptDateChip === "in7d") base.setDate(base.getDate() + 7);
    else if (aptDateChip === "custom") {
      const m = aptCustomDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!m) return null;
      base.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (isNaN(base.getTime())) return null;
    }
    const h = Math.max(0, Math.min(23, parseInt(aptHour, 10) || 0));
    const min = Math.max(0, Math.min(59, parseInt(aptMinute, 10) || 0));
    base.setHours(h, min, 0, 0);
    return base;
  }

  const aptDateLabel = useMemo(() => {
    const d = computeAptDate();
    if (!d) return "Date invalide";
    return d.toLocaleString("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aptDateChip, aptCustomDate, aptHour, aptMinute]);

  async function handleSchedule() {
    if (!client) return;
    const when = computeAptDate();
    if (!when) {
      Alert.alert("Date invalide", "Vérifiez le format de date (AAAA-MM-JJ).");
      return;
    }
    setScheduling(true);
    try {
      const res = await authedFetch(`/api/appointments`, {
        method: "POST",
        body: JSON.stringify({
          clientId: client.id,
          scheduledAt: when.toISOString(),
          durationMin: parseInt(aptDuration, 10) || 30,
          location: aptLocation.trim() || null,
          notes: aptNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSchedule(false);
      setAptLocation("");
      setAptNotes("");
      load(); // reload notes (the rdv note is auto-created)
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de planifier");
    } finally {
      setScheduling(false);
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
            await authedFetch(`/api/clients/${client.id}`, { method: "DELETE" });
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
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#0284c7" }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  tryOpenSchedule();
                }}
              >
                <Feather name="calendar" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Planifier RDV</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#7c3aed" }]} onPress={handleShare}>
                <Feather name="share-2" size={15} color="#fff" />
                <Text style={styles.actionBtnText}>Partager</Text>
              </Pressable>
            </View>
          </View>

          {/* Status selector — visible to all team members */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Statut du dossier</Text>
            <View style={styles.riskRow}>
              {STATUS_OPTIONS.map((s) => {
                const active = client.status === s.value;
                return (
                  <Pressable
                    key={s.value}
                    onPress={() => handleUpdateStatus(s.value)}
                    style={[
                      styles.riskChip,
                      {
                        flexDirection: "row",
                        gap: 6,
                        backgroundColor: active ? s.color : colors.card,
                        borderColor: active ? s.color : colors.border,
                      },
                    ]}
                  >
                    <Feather name={s.icon} size={13} color={active ? "#fff" : s.color} />
                    <Text
                      style={[
                        styles.riskChipText,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              Changement visible par toute l'équipe.
            </Text>
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

      {/* Schedule appointment modal */}
      <Modal
        visible={showSchedule}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSchedule(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Planifier un rendez-vous</Text>
                <Pressable onPress={() => setShowSchedule(false)} hitSlop={12}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 480 }}>
                <Text style={[styles.modalSummary, { color: "#0284c7" }]}>{aptDateLabel}</Text>

                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Date</Text>
                <View style={styles.chipRow}>
                  {[
                    ["today", "Aujourd'hui"],
                    ["tomorrow", "Demain"],
                    ["in2d", "Après-demain"],
                    ["in7d", "Dans 7 jours"],
                    ["custom", "Date précise"],
                  ].map(([k, label]) => {
                    const active = aptDateChip === k;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => setAptDateChip(k as any)}
                        style={[
                          styles.dateChip,
                          { borderColor: active ? "#0284c7" : colors.border, backgroundColor: active ? "#0284c7" : "transparent" },
                        ]}
                      >
                        <Text style={[styles.dateChipText, { color: active ? "#fff" : colors.foreground }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {aptDateChip === "custom" && (
                  <TextInput
                    placeholder="AAAA-MM-JJ"
                    placeholderTextColor={colors.mutedForeground}
                    value={aptCustomDate}
                    onChangeText={setAptCustomDate}
                    style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
                  />
                )}

                <Text style={[styles.modalLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Heure</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    placeholder="14"
                    placeholderTextColor={colors.mutedForeground}
                    value={aptHour}
                    onChangeText={setAptHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.modalInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                  />
                  <Text style={[styles.colon, { color: colors.foreground }]}>:</Text>
                  <TextInput
                    placeholder="00"
                    placeholderTextColor={colors.mutedForeground}
                    value={aptMinute}
                    onChangeText={setAptMinute}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.modalInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                  />
                  <TextInput
                    placeholder="30 min"
                    placeholderTextColor={colors.mutedForeground}
                    value={aptDuration}
                    onChangeText={setAptDuration}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[styles.modalInput, { flex: 1.4, color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>

                <Text style={[styles.modalLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Lieu</Text>
                <TextInput
                  placeholder="ex. CLSC, café, domicile"
                  placeholderTextColor={colors.mutedForeground}
                  value={aptLocation}
                  onChangeText={setAptLocation}
                  style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
                />

                <Text style={[styles.modalLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Notes (optionnel)</Text>
                <TextInput
                  placeholder="Sujet, préparation, etc."
                  placeholderTextColor={colors.mutedForeground}
                  value={aptNotes}
                  onChangeText={setAptNotes}
                  multiline
                  numberOfLines={3}
                  style={[styles.modalInput, { minHeight: 70, textAlignVertical: "top", color: colors.foreground, borderColor: colors.border }]}
                />
              </ScrollView>

              <Pressable
                onPress={handleSchedule}
                disabled={scheduling}
                style={({ pressed }) => [styles.modalSaveBtn, { opacity: pressed || scheduling ? 0.7 : 1 }]}
              >
                {scheduling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="calendar" size={16} color="#fff" />
                    <Text style={styles.modalSaveBtnText}>Confirmer le RDV</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PlanLimitModal
        visible={showAptLimit}
        onDismiss={() => setShowAptLimit(false)}
        currentPlanId={gate.planId}
        upgradePlanId={gate.upgradePlanId}
        limitKind="appointments"
        limitValue={gate.plan.features.maxAppointmentsPerMonth}
      />
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
  statusHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8, fontStyle: "italic" },
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalSummary: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 0,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  colon: { fontSize: 18, fontFamily: "Inter_700Bold", alignSelf: "center" },
  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  modalSaveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
