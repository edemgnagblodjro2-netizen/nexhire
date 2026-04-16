import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

function InitialsAvatar({ firstName, lastName, size = 80 }: { firstName: string | null; lastName: string | null; size?: number }) {
  const colors = useColors();
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || "?";
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string | null }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const colors = useColors();
  const router = useRouter();

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);

  const isFr = language === "fr";

  async function handleSaveAddress() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const err = await updateProfile({ address: addressValue.trim() || null });
    setSaving(false);
    if (err) {
      Alert.alert(isFr ? "Erreur" : "Error", err);
    } else {
      setEditingAddress(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient banner with avatar */}
        <LinearGradient
          colors={[colors.primary, "#0a5e52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.avatarRing}>
            <InitialsAvatar firstName={user?.firstName ?? null} lastName={user?.lastName ?? null} size={80} />
          </View>
          <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fullName}</Text>
          <View style={styles.heroBadge}>
            <Feather name="mail" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroEmail}>{user?.email || "—"}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {isFr ? "Informations personnelles" : "Personal information"}
          </Text>

          <InfoRow icon="user" label={isFr ? "Prénom" : "First name"} value={user?.firstName ?? null} />
          <InfoRow icon="user" label={isFr ? "Nom" : "Last name"} value={user?.lastName ?? null} />
          <InfoRow icon="mail" label={isFr ? "Courriel" : "Email"} value={user?.email ?? null} />

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="map-pin" size={15} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                {isFr ? "Adresse" : "Address"}
              </Text>
              {editingAddress ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.addressInput, { color: colors.foreground, borderColor: colors.primary }]}
                    value={addressValue}
                    onChangeText={setAddressValue}
                    placeholder={isFr ? "Entrez votre adresse" : "Enter your address"}
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveAddress}
                  />
                  <View style={styles.editBtns}>
                    <Pressable
                      onPress={handleSaveAddress}
                      disabled={saving}
                      style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.saveBtnText}>{saving ? "..." : isFr ? "Sauvegarder" : "Save"}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { setEditingAddress(false); setAddressValue(user?.address || ""); }}
                      style={[styles.cancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                        {isFr ? "Annuler" : "Cancel"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.addressRow}>
                  <Text style={[styles.infoValue, { color: colors.foreground, flex: 1 }]}>
                    {user?.address || (isFr ? "Non renseignée" : "Not provided")}
                  </Text>
                  <Pressable
                    onPress={() => { setEditingAddress(true); setAddressValue(user?.address || ""); }}
                    style={[styles.editBtn, { backgroundColor: colors.primary + "15" }]}
                  >
                    <Feather name="edit-2" size={13} color={colors.primary} />
                    <Text style={[styles.editBtnText, { color: colors.primary }]}>
                      {isFr ? "Modifier" : "Edit"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {isFr ? "Sécurité" : "Security"}
          </Text>

          <Pressable
            onPress={() => router.push("/forgot-password")}
            style={({ pressed }) => [
              styles.actionRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="lock" size={15} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>
              {isFr ? "Changer le mot de passe" : "Change password"}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {isFr ? "Préférences" : "Preferences"}
          </Text>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); toggleLanguage(); }}
            style={({ pressed }) => [
              styles.actionRow,
              { borderBottomColor: "transparent", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
              <Text style={{ fontSize: 14 }}>{language === "fr" ? "🇬🇧" : "🇫🇷"}</Text>
            </View>
            <Text style={[styles.actionText, { color: colors.foreground, flex: 1 }]}>
              {isFr ? "Langue" : "Language"}
            </Text>
            <View style={[styles.langPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.langPillText}>{language === "fr" ? "FR → EN" : "EN → FR"}</Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { borderColor: "#ef4444", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>{isFr ? "Se déconnecter" : "Log out"}</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>AttenteZéro · v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 100,
    gap: 16,
  },

  /* Hero banner */
  heroBanner: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
    gap: 8,
    marginHorizontal: -20,
    marginBottom: 4,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }
      : { elevation: 6 }),
  },
  avatarText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  editRow: {
    gap: 8,
  },
  addressInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginTop: 4,
  },
  editBtns: {
    flexDirection: "row",
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langPillText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: "#ef4444",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});
