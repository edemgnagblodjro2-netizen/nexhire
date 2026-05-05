import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { getApiBaseUrl } from "@/lib/apiBase";
import { useAuth } from "@/lib/auth";

export default function BugReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isFr = language !== "en";

  // v1.1.9 — Pre-fill from query params when launched from a service page
  // (e.g. "Signaler un mauvais numéro" button). This lets users report wrong
  // phone numbers in 2 taps instead of typing the service name + context.
  const params = useLocalSearchParams<{
    serviceId?: string;
    serviceName?: string;
    currentPhone?: string;
    type?: string; // "phone" | "info" | "closed" | etc.
  }>();
  const reportType = typeof params.type === "string" ? params.type : "";
  const serviceName =
    typeof params.serviceName === "string" ? params.serviceName : "";
  const currentPhone =
    typeof params.currentPhone === "string" ? params.currentPhone : "";
  const serviceId =
    typeof params.serviceId === "string" ? params.serviceId : "";

  const isPhoneReport = reportType === "phone";
  const screenTitle = isPhoneReport
    ? isFr ? "Signaler un mauvais numéro" : "Report wrong phone number"
    : isFr ? "Signaler un bogue" : "Report a bug";
  const screenSub = isPhoneReport
    ? isFr
      ? "Aidez-nous à corriger les coordonnées erronées en quelques secondes."
      : "Help us correct wrong contact info in seconds."
    : isFr
      ? "Ce formulaire sert uniquement à signaler les bogues et problèmes liés à l'application."
      : "This form is for reporting bugs and issues with the app only.";

  const prefilledMessage = isPhoneReport && serviceName
    ? (isFr
        ? `Mauvais numéro pour : ${serviceName}\nNuméro affiché : ${currentPhone || "(aucun)"}\n\nLe bon numéro est : `
        : `Wrong phone for: ${serviceName}\nDisplayed: ${currentPhone || "(none)"}\n\nThe correct number is: `)
    : "";

  const [name, setName] = useState(
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState(prefilledMessage);
  const [submitting, setSubmitting] = useState(false);

  function clearForm() {
    Haptics.selectionAsync();
    setName("");
    setEmail("");
    setMessage("");
  }

  async function submit() {
    const trimmedName = name.trim();
    const trimmedMsg = message.trim();
    if (trimmedName.length === 0) {
      Alert.alert(
        isFr ? "Nom requis" : "Name required",
        isFr ? "Veuillez entrer votre nom." : "Please enter your name.",
      );
      return;
    }
    if (trimmedMsg.length < 5) {
      Alert.alert(
        isFr ? "Message requis" : "Message required",
        isFr
          ? "Décrivez le bogue en au moins quelques mots."
          : "Please describe the bug in a few words.",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const appVersion = (Constants.expoConfig?.version as string | undefined) ?? "unknown";
      // Tag the message so admins can filter wrong-number reports easily.
      const taggedMsg = isPhoneReport && serviceId
        ? `[NUMERO ERRONE - service:${serviceId}]\n${trimmedMsg}`
        : trimmedMsg;
      const res = await fetch(`${getApiBaseUrl()}/api/bug-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
        body: JSON.stringify({
          name: trimmedName,
          email: email.trim() || undefined,
          message: taggedMsg,
          appVersion,
          platform: Platform.OS,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isFr ? "Merci !" : "Thank you!",
        isFr
          ? "Votre signalement a été envoyé. L'équipe d'AttenteZéro le regardera rapidement."
          : "Your report was sent. The AttenteZéro team will review it shortly.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        isFr ? "Erreur" : "Error",
        err instanceof Error ? err.message : isFr ? "Erreur réseau" : "Network error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header with back arrow ── */}
        <LinearGradient
          colors={["#0e7e6e", "#0a5e52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Feather name="chevron-left" size={26} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
              {screenTitle}
            </Text>
          </View>
          <Text style={styles.headerSub}>{screenSub}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Nom */}
          <Text style={[styles.label, { color: colors.foreground }]}>
            {isFr ? "Nom" : "Name"} <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={isFr ? "Votre nom" : "Your name"}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            maxLength={120}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Courriel */}
          <Text style={[styles.label, { color: colors.foreground }]}>
            {isFr ? "Courriel" : "Email"}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="exemple@courriel.ca"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            maxLength={200}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          {/* Message */}
          <Text style={[styles.label, { color: colors.foreground }]}>
            {isFr ? "Message" : "Message"} <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={
              isFr
                ? "Décrivez le bogue rencontré, ce que vous faisiez, ce qui aurait dû arriver…"
                : "Describe the bug, what you were doing, what should have happened…"
            }
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.messageInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            maxLength={4000}
          />
          <Text style={[styles.counter, { color: colors.mutedForeground }]}>
            {message.length} / 4000
          </Text>

          {/* Boutons Effacer / Soumettre */}
          <View style={styles.actions}>
            <Pressable
              onPress={clearForm}
              disabled={submitting}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed || submitting ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: colors.foreground }]}>
                {isFr ? "Effacer" : "Clear"}
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                { opacity: pressed || submitting ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>
                {submitting
                  ? isFr ? "Envoi…" : "Sending…"
                  : isFr ? "Soumettre" : "Submit"}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.noteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={15} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {isFr
                ? "Pour des urgences personnelles, composez le 211 ou le 911. Ce formulaire concerne uniquement l'application."
                : "For personal emergencies, dial 211 or 911. This form is for app issues only."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    lineHeight: 18,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  messageInput: {
    minHeight: 140,
    paddingTop: 12,
  },
  counter: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: 1,
  },
  btnGhostText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  btnPrimary: {
    backgroundColor: "#0e7e6e",
  },
  btnPrimaryText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  noteBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 18,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
