import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  userEmail?: string | null;
  remaining: number;
}

export default function PremiumGateModal({ visible, onDismiss, userEmail, remaining }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(userEmail ?? "");
  const [sent, setSent] = useState(false);

  function handleSend() {
    const addr = email.trim();
    if (!addr || !addr.includes("@")) {
      Alert.alert("Courriel invalide", "Veuillez entrer une adresse courriel valide.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const subject = encodeURIComponent("Demande d'abonnement — AttenteZéro Premium");
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite m'abonner à AttenteZéro Premium (5 $/mois).\n\nMon courriel : ${addr}\n\nMerci de me contacter pour finaliser l'abonnement.\n\nCordialement`
    );
    const mailUrl = `mailto:abonnement@attentezero.ca?subject=${subject}&body=${body}`;

    Linking.openURL(mailUrl).catch(() => {
      Alert.alert(
        "Aucune application de courriel",
        `Envoyez manuellement un courriel à :\nabonnement@attentezero.ca\n\nEn précisant votre adresse : ${addr}`
      );
    });

    setSent(true);
  }

  function handleDismiss() {
    setSent(false);
    onDismiss();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Gradient header */}
          <LinearGradient
            colors={["#1e1b4b", "#3730a3", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGrad}
          >
            <View style={styles.headerIconWrap}>
              <Feather name="star" size={28} color="#fbbf24" />
            </View>
            <Text style={styles.headerTitle}>
              {sent ? "Demande envoyée !" : "Passez à Premium"}
            </Text>
            <Text style={styles.headerSub}>
              {sent
                ? "Nous vous contacterons sous 24 h pour finaliser votre abonnement."
                : "Vous avez utilisé vos 3 essais gratuits. Abonnez-vous pour continuer à profiter des fonctionnalités avancées."}
            </Text>
            <View style={styles.orb1} />
            <View style={styles.orb2} />
          </LinearGradient>

          <View style={styles.body}>
            {sent ? (
              /* ── Success state ── */
              <>
                <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: "#10b981" + "30" }]}>
                  <Feather name="check-circle" size={20} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.successTitle, { color: colors.foreground }]}>
                      Courriel ouvert dans votre application
                    </Text>
                    <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>
                      Envoyez le courriel pré-rempli pour confirmer votre demande d'abonnement.
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handleDismiss}
                  style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Fermer</Text>
                </Pressable>
              </>
            ) : (
              /* ── Form state ── */
              <>
                {/* Price reminder */}
                <View style={[styles.priceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.pricePill}>
                    <Text style={styles.priceAmount}>5 $</Text>
                    <Text style={styles.pricePeriod}>/mois</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceDesc, { color: colors.foreground }]}>
                      Suivi · Historique · Alertes · Priorisation
                    </Text>
                    <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>
                      Annulable à tout moment
                    </Text>
                  </View>
                </View>

                {/* Email input */}
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                  Votre adresse courriel
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Feather name="mail" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="vous@exemple.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>

                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Un courriel pré-rempli s'ouvrira dans votre application de messagerie pour confirmer votre abonnement.
                </Text>

                {/* Send button */}
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.88 }]}
                >
                  <LinearGradient
                    colors={["#6d28d9", "#7c3aed"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendBtnGrad}
                  >
                    <Feather name="send" size={17} color="#fff" />
                    <Text style={styles.sendBtnText}>Envoyer la demande d'abonnement</Text>
                  </LinearGradient>
                </Pressable>

                {/* Dismiss */}
                <Pressable onPress={handleDismiss} style={styles.laterBtn}>
                  <Text style={[styles.laterText, { color: colors.mutedForeground }]}>
                    Plus tard
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 }
      : { elevation: 24 }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  /* Header */
  headerGrad: {
    padding: 24,
    paddingTop: 16,
    gap: 10,
    overflow: "hidden",
    alignItems: "center",
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(251,191,36,0.18)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 19,
  },
  orb1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -40,
    right: -30,
  },
  orb2: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -20,
    left: 20,
  },

  body: {
    padding: 20,
    gap: 12,
  },

  /* Price row */
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  priceAmount: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  pricePeriod: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  priceDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  priceSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  /* Input */
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: -4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: -4,
  },

  /* Send btn */
  sendBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12 }
      : { elevation: 6 }),
  },
  sendBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 15,
  },
  sendBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  /* Dismiss */
  laterBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },

  /* Success */
  successBox: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "flex-start",
  },
  successTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  closeBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
