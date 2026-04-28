import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { authedFetch } from "@/lib/apiClient";
import { getApiBaseUrl } from "@/lib/apiBase";

const ADVANCED_FEATURES = [
  { icon: "bar-chart-2" as const, color: "#0e7e6e", bg: "#f0fdf4", darkBg: "#052e1c", labelFr: "Suivi personnalisé", labelEn: "Personal tracking", descFr: "Suivez l'évolution de vos démarches en temps réel", descEn: "Track your applications in real time" },
  { icon: "clock" as const, color: "#7c3aed", bg: "#f5f3ff", darkBg: "#2e1a5e", labelFr: "Historique complet", labelEn: "Full history", descFr: "Retrouvez vos recherches et services consultés", descEn: "Find your past searches and services" },
  { icon: "bell" as const, color: "#d97706", bg: "#fffbeb", darkBg: "#3b2006", labelFr: "Alertes intelligentes", labelEn: "Smart alerts", descFr: "Notifié dès qu'un service proche est disponible", descEn: "Notified when a nearby service opens" },
  { icon: "star" as const, color: "#e11d48", bg: "#fff1f2", darkBg: "#3b0a16", labelFr: "Priorisation", labelEn: "Prioritization", descFr: "Services les plus pertinents en premier", descEn: "Most relevant services first" },
];

const FUNDING_OPTIONS = [
  { icon: "heart" as const, color: "#e11d48", bg: "#fff1f2", darkBg: "#3b0a16", titleFr: "Faire un don", titleEn: "Make a donation", descFr: "Soutenir AttenteZéro et financer de nouveaux services", descEn: "Support AttenteZéro and fund new services", badgeFr: "Bientôt", badgeEn: "Soon", badgeColor: "#e11d48", route: null as string | null },
  { icon: "briefcase" as const, color: "#7c3aed", bg: "#f5f3ff", darkBg: "#2e1a5e", titleFr: "Partenariat organisation", titleEn: "Organization partnership", descFr: "Vous êtes un organisme communautaire ? Référencez vos services gratuitement", descEn: "Community organization? List your services for free", badgeFr: "Bientôt", badgeEn: "Soon", badgeColor: "#7c3aed", route: null },
  { icon: "users" as const, color: "#0284c7", bg: "#f0f9ff", darkBg: "#0c2a3b", titleFr: "Programme ambassadeur", titleEn: "Ambassador program", descFr: "Parrainez des proches et gagnez des mois premium offerts", descEn: "Refer loved ones and earn free premium months", badgeFr: "Nouveau", badgeEn: "New", badgeColor: "#0284c7", route: "/ambassador" },
  { icon: "tag" as const, color: "#059669", bg: "#f0fdf4", darkBg: "#052e1c", titleFr: "Publicité locale responsable", titleEn: "Local responsible advertising", descFr: "Pour organismes et institutions seulement — zéro pub intrusive", descEn: "For orgs and institutions only — zero intrusive ads", badgeFr: "Bientôt", badgeEn: "Soon", badgeColor: "#059669", route: null },
];

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
  const { user, logout, updateProfile, isAuthenticated, getToken } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const colors = useColors();
  const router = useRouter();
  const isDark = colors.background === "#09090b" || colors.background === "#0a0a0a";

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  const isFr = language === "fr";

  const loadPendingInvites = React.useCallback(async () => {
    try {
      const r = await authedFetch(`/api/invitations/pending`);
      if (!r.ok) return;
      const j = await r.json();
      setPendingInvitesCount(Array.isArray(j.invitations) ? j.invitations.length : 0);
    } catch {
      // silent — banner just won't show
    }
  }, []);

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  useFocusEffect(
    React.useCallback(() => {
      loadPendingInvites();
    }, [loadPendingInvites]),
  );

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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.primary, "#0a5e52"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={[styles.avatarRing, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="user" size={40} color="#ffffff" />
            </View>
            <Text style={styles.heroName}>
              {isFr ? "Bienvenue !" : "Welcome!"}
            </Text>
            <Text style={[styles.heroEmail, { marginTop: 4 }]}>
              {isFr ? "Mode invité" : "Guest mode"}
            </Text>
          </LinearGradient>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 20 }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isFr ? "Créez un compte gratuit" : "Create a free account"}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 20, marginBottom: 16, fontFamily: "Inter_400Regular" }}>
              {isFr
                ? "Avec un compte, vous pouvez :\n• Sauvegarder vos services favoris\n• Recevoir des alertes personnalisées\n• Discuter avec l'assistant IA\n• Synchroniser entre appareils"
                : "With an account, you can:\n• Save your favorite services\n• Get personalized alerts\n• Chat with the AI assistant\n• Sync across devices"}
            </Text>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/login" as any); }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                opacity: pressed ? 0.9 : 1,
                marginBottom: 10,
              })}
            >
              <Feather name="log-in" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
                {isFr ? "Se connecter" : "Sign in"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/register" as any); }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 13,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Feather name="user-plus" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>
                {isFr ? "Créer un compte gratuit" : "Create free account"}
              </Text>
            </Pressable>
          </View>

          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center", marginTop: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 24, lineHeight: 18 }}>
            {isFr
              ? "Vous pouvez continuer à utiliser l'application gratuitement sans compte."
              : "You can keep using the app for free without an account."}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

        {pendingInvitesCount > 0 ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/invitations");
            }}
            style={({ pressed }) => [
              styles.invitesBanner,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.invitesBadge}>
              <Text style={styles.invitesBadgeText}>{pendingInvitesCount}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.invitesTitle}>
                {isFr
                  ? pendingInvitesCount === 1
                    ? "1 invitation d'équipe en attente"
                    : `${pendingInvitesCount} invitations d'équipe en attente`
                  : pendingInvitesCount === 1
                    ? "1 pending team invitation"
                    : `${pendingInvitesCount} pending team invitations`}
              </Text>
              <Text style={styles.invitesSubtitle}>
                {isFr ? "Toucher pour accepter ou refuser" : "Tap to accept or decline"}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#1d4ed8" />
          </Pressable>
        ) : null}

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

        {user?.role === "organisme" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Feather name="briefcase" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, marginLeft: 8, marginBottom: 0 }]}>
                {isFr ? "Votre espace Organisme" : "Your Organization Space"}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 12, lineHeight: 18 }}>
              {isFr
                ? "Gérez vos statistiques, votre fiche et votre abonnement depuis un ordinateur :"
                : "Manage your stats, profile and subscription from a computer:"}
            </Text>
            <View style={{
              backgroundColor: colors.primary + "10",
              borderRadius: 8, padding: 10, marginBottom: 10,
              borderWidth: 1, borderColor: colors.primary + "30",
            }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }} selectable>
                attentezero.replit.app/org-login
              </Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                {isFr ? "Mêmes identifiants que cette app." : "Same login as this app."}
              </Text>
            </View>
            {[
              isFr ? "📊 Statistiques (vues, appels, clics)" : "📊 Stats (views, calls, clicks)",
              isFr ? "💳 Gestion de l'abonnement" : "💳 Subscription management",
              isFr ? "🛡️ Badge Vérifié sur votre fiche" : "🛡️ Verified badge on your listing",
              isFr ? "❌ Annulation à tout moment" : "❌ Cancel anytime",
            ].map((line) => (
              <Text key={line} style={{ fontSize: 12, color: colors.foreground, marginBottom: 4 }}>
                {line}
              </Text>
            ))}
            <Pressable
              onPress={() => Linking.openURL("https://attentezero.replit.app/org-login")}
              style={({ pressed }) => [{
                marginTop: 12,
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 11,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                {isFr ? "Ouvrir mon panneau admin" : "Open my admin panel"}
              </Text>
            </Pressable>
          </View>
        )}

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

        {/* ── Mon abonnement (Stripe billing portal) ── */}
        {user?.email && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isFr ? "Mon abonnement" : "My subscription"}
            </Text>
            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                try {
                  const tk = await getToken().catch(() => null);
                  const res = await fetch(`${getApiBaseUrl()}/api/stripe/user-portal`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
                    },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.url) {
                    Alert.alert(
                      isFr ? "Aucun abonnement" : "No subscription",
                      data.error ?? (isFr
                        ? "Aucun abonnement Stripe trouvé pour votre compte."
                        : "No Stripe subscription found for your account."),
                    );
                    return;
                  }
                  await WebBrowser.openBrowserAsync(data.url);
                } catch (err) {
                  Alert.alert(
                    isFr ? "Erreur" : "Error",
                    err instanceof Error ? err.message : "Network error",
                  );
                }
              }}
              style={({ pressed }) => [
                styles.accountRow,
                { borderBottomColor: "transparent", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.infoIcon, { backgroundColor: isDark ? "#1e1b4b" : "#eef2ff" }]}>
                <Feather name="credit-card" size={15} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionText, { color: colors.foreground }]} numberOfLines={1}>
                  {isFr ? "Gérer mon abonnement" : "Manage my subscription"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>
                  {isFr
                    ? "Paiement, changer de forfait, annuler"
                    : "Payment, change plan, cancel"}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* ── Fonctionnalités avancées (Premium features) ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 0 }]}>
              {isFr ? "Fonctionnalités avancées" : "Advanced features"}
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: "#7c3aed18", paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 10, borderWidth: 1, borderColor: "#7c3aed30",
            }}>
              <Feather name="star" size={10} color="#7c3aed" />
              <Text style={{ fontSize: 10, color: "#7c3aed", fontWeight: "700" }}>PREMIUM</Text>
            </View>
          </View>
          {ADVANCED_FEATURES.map((f, idx) => (
            <Pressable
              key={f.labelFr}
              onPress={() => { Haptics.selectionAsync(); router.push("/premium" as any); }}
              style={({ pressed }) => [
                styles.advancedRow,
                {
                  borderBottomColor: idx === ADVANCED_FEATURES.length - 1 ? "transparent" : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.infoIcon, { backgroundColor: isDark ? f.darkBg : f.bg }]}>
                <Feather name={f.icon} size={15} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionText, { color: colors.foreground }]} numberOfLines={1}>
                  {isFr ? f.labelFr : f.labelEn}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>
                  {isFr ? f.descFr : f.descEn}
                </Text>
              </View>
              <Feather name="lock" size={14} color="#7c3aed" />
            </Pressable>
          ))}
        </View>

        {/* ── Soutenir AttenteZéro ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {isFr ? "Soutenir AttenteZéro" : "Support AttenteZéro"}
          </Text>

          <Pressable
            onPress={async () => {
              Haptics.selectionAsync();
              try {
                const playStoreUrl = "https://play.google.com/store/apps/details?id=com.attentezero.app";
                const message = isFr
                  ? `Découvrez AttenteZéro — l'application gratuite pour trouver les services communautaires du Québec en quelques secondes.\n\n📱 Téléchargez : ${playStoreUrl}`
                  : `Discover AttenteZéro — the free app to find Quebec community services in seconds.\n\n📱 Download: ${playStoreUrl}`;
                await Share.share({ message, title: "AttenteZéro" });
              } catch { /* cancelled */ }
            }}
            style={({ pressed }) => [
              styles.advancedRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.infoIcon, { backgroundColor: isDark ? "#0a3d36" : "#d1fae5" }]}>
              <Feather name="share-2" size={15} color="#0e7e6e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: colors.foreground }]} numberOfLines={1}>
                {isFr ? "Partager l'application" : "Share the app"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>
                {isFr
                  ? "Aidez vos proches à trouver les bons services"
                  : "Help your loved ones find the right services"}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          {FUNDING_OPTIONS.map((opt, idx) => (
            <Pressable
              key={opt.titleFr}
              onPress={() => {
                Haptics.selectionAsync();
                if (opt.route) {
                  router.push(opt.route as any);
                  return;
                }
                Alert.alert(
                  isFr ? opt.titleFr : opt.titleEn,
                  isFr
                    ? "Cette fonctionnalité arrive bientôt. En attendant, vous pouvez nous écrire via « Signaler un bogue » au bas du menu Plus."
                    : "This feature is coming soon. In the meantime, you can reach us via \"Report a bug\" at the bottom of the More menu.",
                );
              }}
              style={({ pressed }) => [
                styles.advancedRow,
                {
                  borderBottomColor: idx === FUNDING_OPTIONS.length - 1 ? "transparent" : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.infoIcon, { backgroundColor: isDark ? opt.darkBg : opt.bg }]}>
                <Feather name={opt.icon} size={15} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={[styles.actionText, { color: colors.foreground }]} numberOfLines={1}>
                    {isFr ? opt.titleFr : opt.titleEn}
                  </Text>
                  <View style={{
                    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
                    backgroundColor: opt.badgeColor + "18", borderWidth: 1, borderColor: opt.badgeColor + "30",
                  }}>
                    <Text style={{ fontSize: 9, color: opt.badgeColor, fontWeight: "700" }}>
                      {isFr ? opt.badgeFr : opt.badgeEn}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={2}>
                  {isFr ? opt.descFr : opt.descEn}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
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
  invitesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  invitesBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  invitesBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  invitesTitle: { fontSize: 14, fontWeight: "700", color: "#1e3a8a" },
  invitesSubtitle: { fontSize: 12, color: "#1d4ed8", marginTop: 2 },

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
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  advancedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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
