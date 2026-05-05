import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import { Platform } from "react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";

// v1.1.9 — Écran "Signaler une mauvaise position".
// Permet à l'usager de proposer une correction d'adresse / coordonnées
// pour une fiche service mal géolocalisée. Auto-validation à 3 corrections
// concordantes (cf. /api/services/:id/corrections).
export default function CorrectionScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { services } = useServicesData();
  const service = services.find((s) => s.id === params.id);

  const [proposedAddress, setProposedAddress] = useState(service?.address ?? "");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ textAlign: "center", marginTop: 80, color: colors.foreground }}>
          Service introuvable.
        </Text>
      </View>
    );
  }

  async function captureMyPosition() {
    Haptics.selectionAsync();
    setLoadingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Localisation refusée",
          "Activez la localisation dans les réglages de votre téléphone pour partager la position exacte du service.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Impossible d'obtenir votre position.");
    } finally {
      setLoadingLoc(false);
    }
  }

  async function submit() {
    if (!proposedAddress.trim() && !coords && !note.trim()) {
      Alert.alert(
        "Correction vide",
        "Indiquez au moins la nouvelle adresse, votre position GPS, ou une note.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const apiUrl =
        process.env.EXPO_PUBLIC_API_URL ?? "https://quebec-aid-finder.replit.app";
      const appVersion =
        (Constants.expoConfig?.version ?? "") +
        (Platform.OS ? `-${Platform.OS}` : "");
      const res = await fetch(`${apiUrl}/api/services/${service!.id}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedAddress: proposedAddress.trim() || undefined,
          proposedLat: coords?.lat,
          proposedLng: coords?.lng,
          note: note.trim() || undefined,
          appVersion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(
        data?.message ??
          "Merci ! Votre correction sera examinée prochainement.",
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Échec", err?.message ?? "Impossible d'envoyer la correction.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Merci</Text>
        </View>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Feather name="check-circle" size={56} color="#0e7e6e" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Merci !</Text>
          <Text style={[styles.successText, { color: colors.mutedForeground }]}>{done}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnTxt}>Retour à la fiche</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Signaler une mauvaise position
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Service concerné</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>{service.name}</Text>
          {service.address ? (
            <Text style={[styles.subValue, { color: colors.mutedForeground }]}>
              Actuellement : {service.address}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Bonne adresse (si vous la connaissez)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={proposedAddress}
            onChangeText={setProposedAddress}
            placeholder="ex : 1234 rue Saint-Denis, Montréal, QC H2X 3K2"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Ou : partagez votre position GPS si vous êtes devant l'organisme
          </Text>
          <TouchableOpacity
            style={[styles.gpsBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={captureMyPosition}
            disabled={loadingLoc}
          >
            {loadingLoc ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="crosshair" size={18} color={coords ? "#0e7e6e" : colors.primary} />
                <Text style={[styles.gpsBtnTxt, { color: coords ? "#0e7e6e" : colors.primary }]}>
                  {coords
                    ? `Position captée (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`
                    : "Capturer ma position actuelle"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Note (optionnel)
          </Text>
          <TextInput
            style={[styles.input, styles.inputBig, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={note}
            onChangeText={setNote}
            placeholder="ex : l'entrée est sur la rue arrière, le bureau a déménagé en 2024…"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color="#fff" />
              <Text style={styles.primaryBtnTxt}>Envoyer la correction</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Anonyme. Pour limiter les abus, nous gardons uniquement un identifiant
          technique de votre appareil (jamais votre IP réelle). Les corrections
          sont validées par notre équipe ou automatiquement quand 3 personnes
          signalent la même chose.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 44,
  },
  inputBig: { minHeight: 80, textAlignVertical: "top" },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  gpsBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  successBox: { padding: 24, alignItems: "center", gap: 14, marginTop: 60 },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(14,126,110,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successText: { fontSize: 15, lineHeight: 22, textAlign: "center", fontFamily: "Inter_400Regular" },
});
