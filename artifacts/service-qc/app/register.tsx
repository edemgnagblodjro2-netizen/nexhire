import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Linking,
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

import { useAuth, type UserRole } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/apiBase";

export default function RegisterScreen() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  // ── Step state ───────────────────────────────────────────
  // null = user must first pick a role (forced choice screen)
  const [role, setRole] = useState<UserRole | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Organisme fields
  const [orgName, setOrgName] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");

  // Intervenant fields
  const [profTitle, setProfTitle] = useState("");
  const [affiliation, setAffiliation] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proSuggestionDismissed, setProSuggestionDismissed] = useState(false);
  const [orgWelcome, setOrgWelcome] = useState<{ organisationId: string } | null>(null);

  // Detect if email looks professional (custom domain, not a free webmail)
  const looksLikePro = React.useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    const match = trimmed.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
    if (!match) return false;
    const domain = match[1];
    const FREE_DOMAINS = new Set([
      "gmail.com", "googlemail.com",
      "yahoo.com", "yahoo.ca", "yahoo.fr", "ymail.com", "rocketmail.com",
      "hotmail.com", "hotmail.ca", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.ca", "live.fr", "msn.com",
      "icloud.com", "me.com", "mac.com",
      "protonmail.com", "proton.me", "pm.me",
      "aol.com", "gmx.com", "gmx.fr", "mail.com", "zoho.com", "yandex.com",
      "videotron.ca", "sympatico.ca", "bell.net", "rogers.com", "cogeco.ca",
      "globetrotter.net", "qc.aira.com", "hec.ca",
    ]);
    return !FREE_DOMAINS.has(domain);
  }, [email]);

  const showProSuggestion = role === "user" && looksLikePro && !proSuggestionDismissed;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [role]);

  async function handleRegister() {
    if (!role) return;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (role === "organisme" && !orgName.trim()) {
      setError("Le nom de l'organisme est requis.");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await register(
      email.trim().toLowerCase(),
      password,
      firstName.trim(),
      lastName.trim(),
      address.trim() || undefined,
      role,
      role === "organisme"
        ? {
            organisationName: orgName.trim(),
            organisationCity: orgCity.trim() || undefined,
            organisationPhone: orgPhone.trim() || undefined,
            organisationWebsite: orgWebsite.trim() || undefined,
            plan: "standard",
          }
        : role === "intervenant"
        ? {
            organisationName: `${firstName.trim()} ${lastName.trim()}`,
            organisationCity: orgCity.trim() || undefined,
            organisationPhone: orgPhone.trim() || undefined,
            professionalTitle: profTitle.trim() || undefined,
            affiliation: affiliation.trim() || undefined,
            plan: "terrain",
          }
        : undefined,
    );

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    setLoading(false);

    // Organisme: show welcome screen with admin panel info first
    if (role === "organisme" && result.organisationId) {
      setOrgWelcome({ organisationId: result.organisationId });
    }
  }

  async function startOrgTrialCheckout() {
    if (!orgWelcome) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          organisationId: orgWelcome.organisationId,
          plan: "standard",
          interval: "monthly",
        }),
      });
      const data = await res.json();
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch {
      // Subscription started in trial mode regardless
    }
  }

  // ─── Welcome screen for new organisms ────────────────────
  if (orgWelcome) {
    const ADMIN_URL = "https://attentezero.replit.app/org-login";
    return (
      <LinearGradient colors={["#0a6558", "#0e7e6e", "#1a9f8c"]} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingTop: 32, paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: "rgba(255,255,255,0.18)",
                alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <Feather name="check-circle" size={48} color="#fff" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" }}>
                Bienvenue sur AttenteZéro !
              </Text>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 8, paddingHorizontal: 16 }}>
                Votre compte organisme est créé. Votre essai gratuit de 14 jours commence maintenant.
              </Text>
            </View>

            <View style={{
              backgroundColor: "rgba(255,255,255,0.97)",
              borderRadius: 18, padding: 20, marginBottom: 16,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Feather name="monitor" size={20} color="#0a6558" />
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#0a6558", marginLeft: 10 }}>
                  Votre panneau admin web
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 14 }}>
                Gérez votre fiche, vos statistiques et votre abonnement depuis un ordinateur :
              </Text>
              <View style={{
                backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12,
                borderWidth: 1, borderColor: "#86efac", marginBottom: 14,
              }}>
                <Text style={{ fontSize: 13, color: "#166534", fontWeight: "600" }} selectable>
                  {ADMIN_URL}
                </Text>
                <Text style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>
                  Connectez-vous avec les mêmes identifiants que cette app.
                </Text>
              </View>
              {[
                { icon: "bar-chart-2", text: "Statistiques de visites, appels et clics" },
                { icon: "credit-card", text: "Gestion de votre abonnement" },
                { icon: "x-circle", text: "Annulation à tout moment" },
                { icon: "shield", text: "Badge « Vérifié » sur votre fiche" },
              ].map((item) => (
                <View key={item.icon} style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <Feather name={item.icon as any} size={14} color="#0a6558" />
                  <Text style={{ fontSize: 13, color: "#374151", marginLeft: 10 }}>{item.text}</Text>
                </View>
              ))}
              <Pressable
                onPress={() => Linking.openURL(ADMIN_URL)}
                style={({ pressed }) => [{
                  marginTop: 16, backgroundColor: "#0a6558", borderRadius: 10,
                  paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.85 : 1,
                }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Ouvrir mon panneau admin
                </Text>
              </Pressable>
            </View>

            <View style={{
              backgroundColor: "rgba(251,191,36,0.18)",
              borderRadius: 14, padding: 14, marginBottom: 20,
              borderWidth: 1, borderColor: "rgba(251,191,36,0.4)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Feather name="gift" size={16} color="#fbbf24" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff", marginLeft: 8 }}>
                  Activer mon essai gratuit (optionnel)
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 17 }}>
                Pour activer le débit auto à la fin des 14 jours, enregistrez votre carte. Sinon, vous pourrez le faire plus tard.
              </Text>
              <Pressable
                onPress={startOrgTrialCheckout}
                style={({ pressed }) => [{
                  marginTop: 10, backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 8, paddingVertical: 10, alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                  Enregistrer ma carte maintenant
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.replace("/(tabs)")}
              style={({ pressed }) => [{
                paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", textDecorationLine: "underline" }}>
                Continuer vers l'application →
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Step 1: Forced role choice ──────────────────────────
  if (role === null) {
    return (
      <LinearGradient colors={["#0a6558", "#0e7e6e", "#1a9f8c"]} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#ffffff" />
              </Pressable>
              <View style={styles.flex}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                  Créer un compte
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  Quel type de compte voulez-vous ?
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.choiceWrap,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Personne */}
              <Pressable
                onPress={() => setRole("user")}
                style={({ pressed }) => [styles.choiceCard, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.choiceIcon, { backgroundColor: "rgba(16,185,129,0.25)" }]}>
                  <Feather name="user" size={26} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <View style={styles.choiceTitleRow}>
                    <Text style={styles.choiceTitle} numberOfLines={1} adjustsFontSizeToFit>
                      👤 Personne
                    </Text>
                    <View style={[styles.choicePill, { backgroundColor: "rgba(16,185,129,0.25)" }]}>
                      <Text style={styles.choicePillText}>Gratuit</Text>
                    </View>
                  </View>
                  <Text style={styles.choiceDesc} numberOfLines={3}>
                    Pour chercher des services, contacter des organismes et trouver de l'aide.
                  </Text>
                  <View style={styles.choicePerks}>
                    <Text style={styles.choicePerk}>· Recherche illimitée</Text>
                    <Text style={styles.choicePerk}>· Premium optionnel : 10 $ une seule fois</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>

              {/* Intervenant — Travailleur social terrain */}
              <Pressable
                onPress={() => setRole("intervenant")}
                style={({ pressed }) => [styles.choiceCard, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.choiceIcon, { backgroundColor: "rgba(59,130,246,0.28)" }]}>
                  <Feather name="award" size={26} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <View style={styles.choiceTitleRow}>
                    <Text style={styles.choiceTitle} numberOfLines={1} adjustsFontSizeToFit>
                      🏅 Travailleur social terrain
                    </Text>
                    <View style={[styles.choicePill, { backgroundColor: "rgba(59,130,246,0.3)" }]}>
                      <Text style={styles.choicePillText}>14 j gratuits</Text>
                    </View>
                  </View>
                  <Text style={styles.choiceDesc} numberOfLines={3}>
                    Pour les intervenants CLSC, refuges, organismes — dossiers clients, IA illimitée, partage rapide.
                  </Text>
                  <View style={styles.choicePerks}>
                    <Text style={styles.choicePerk}>· Mode terrain + IA + partage</Text>
                    <Text style={styles.choicePerk}>· 19 $/mois après l'essai · Annulable</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>

              {/* Organisme */}
              <Pressable
                onPress={() => setRole("organisme")}
                style={({ pressed }) => [styles.choiceCard, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.choiceIcon, { backgroundColor: "rgba(251,191,36,0.25)" }]}>
                  <Feather name="briefcase" size={26} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <View style={styles.choiceTitleRow}>
                    <Text style={styles.choiceTitle} numberOfLines={1} adjustsFontSizeToFit>
                      🏢 Organisme
                    </Text>
                    <View style={[styles.choicePill, { backgroundColor: "rgba(251,191,36,0.3)" }]}>
                      <Text style={styles.choicePillText}>14 j gratuits</Text>
                    </View>
                  </View>
                  <Text style={styles.choiceDesc} numberOfLines={3}>
                    Pour les OBNL, entreprises et partenaires qui veulent être visibles dans l'app.
                  </Text>
                  <View style={styles.choicePerks}>
                    <Text style={styles.choicePerk}>· Profil + statistiques</Text>
                    <Text style={styles.choicePerk}>· 39 $/mois après l'essai · Annulable</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.footerLink}>Se connecter</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ─── Step 2: Form for selected role ──────────────────────
  const isOrg = role === "organisme";

  return (
    <LinearGradient colors={["#0a6558", "#0e7e6e", "#1a9f8c"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <Pressable onPress={() => setRole(null)} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#ffffff" />
              </Pressable>
              <View style={styles.flex}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                  {isOrg ? "Compte Organisme" : "Compte Personne"}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {isOrg ? "14 jours gratuits, sans carte" : "Inscription gratuite"}
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              {/* Personal info */}
              <View style={styles.row}>
                <View style={[styles.inputWrapper, styles.flex]}>
                  <Feather name="user" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Prénom"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.inputWrapper, styles.flex]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nom"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isOrg ? "Courriel professionnel" : "Adresse courriel"}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>

              {showProSuggestion && (
                <View style={styles.proSuggestion}>
                  <Feather name="briefcase" size={16} color="#fbbf24" style={{ marginTop: 1 }} />
                  <View style={styles.flex}>
                    <Text style={styles.proSuggestionTitle} numberOfLines={2}>
                      Ce courriel semble professionnel
                    </Text>
                    <Text style={styles.proSuggestionDesc} numberOfLines={3}>
                      Si vous représentez un organisme, créez plutôt un compte Organisme pour être visible dans l'app et gérer vos services.
                    </Text>
                    <View style={styles.proSuggestionBtns}>
                      <Pressable
                        onPress={() => setRole("organisme")}
                        style={({ pressed }) => [
                          styles.proSuggestionBtnPrimary,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={styles.proSuggestionBtnPrimaryText} numberOfLines={1}>
                          Passer en Organisme
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setProSuggestionDismissed(true)}
                        style={({ pressed }) => [
                          styles.proSuggestionBtnSecondary,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.proSuggestionBtnSecondaryText} numberOfLines={1}>
                          Non, c'est personnel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {!isOrg && (
                <View style={styles.inputWrapper}>
                  <Feather name="map-pin" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Adresse (optionnel)"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={address}
                    onChangeText={setAddress}
                    autoCapitalize="words"
                    autoComplete="street-address"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Mot de passe (min. 6 caractères)"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.flex]}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType={isOrg ? "next" : "done"}
                  onSubmitEditing={isOrg ? undefined : handleRegister}
                />
              </View>

              {/* Organisme-specific fields */}
              {isOrg && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionLabel}>Votre organisme</Text>

                  <View style={styles.inputWrapper}>
                    <Feather name="briefcase" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nom de l'organisme *"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgName}
                      onChangeText={setOrgName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="map-pin" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ville (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgCity}
                      onChangeText={setOrgCity}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="phone" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Téléphone (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgPhone}
                      onChangeText={setOrgPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="globe" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Site web (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgWebsite}
                      onChangeText={setOrgWebsite}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>

                  {/* Plan summary (no choice — single plan) */}
                  <View style={styles.planSummary}>
                    <View style={styles.planSummaryHead}>
                      <Text style={styles.planSummaryTitle}>Plan Organisme</Text>
                      <Text style={styles.planSummaryPrice}>39 $/mois</Text>
                    </View>
                    <Text style={styles.planSummaryNote} numberOfLines={2}>
                      Profil complet · Badge vérifié · Statistiques · Mise en avant
                    </Text>
                  </View>

                  <View style={styles.trialBox}>
                    <Feather name="gift" size={14} color="#fbbf24" />
                    <Text style={styles.trialText} numberOfLines={2}>
                      14 jours gratuits · Sans carte bancaire · Annulable à tout moment
                    </Text>
                  </View>
                </>
              )}

              {/* Intervenant-specific fields */}
              {role === "intervenant" && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.sectionLabel}>Votre pratique</Text>

                  <View style={styles.inputWrapper}>
                    <Feather name="award" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Titre professionnel (ex. : T.S., intervenant)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={profTitle}
                      onChangeText={setProfTitle}
                      autoCapitalize="sentences"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="briefcase" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Affiliation (CLSC, refuge, OBNL...)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={affiliation}
                      onChangeText={setAffiliation}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="map-pin" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ville (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgCity}
                      onChangeText={setOrgCity}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="phone" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Téléphone professionnel (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={orgPhone}
                      onChangeText={setOrgPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.planSummary}>
                    <View style={styles.planSummaryHead}>
                      <Text style={styles.planSummaryTitle}>Plan Terrain</Text>
                      <Text style={styles.planSummaryPrice}>19 $/mois</Text>
                    </View>
                    <Text style={styles.planSummaryNote} numberOfLines={2}>
                      IA illimitée · Dossiers clients · Partage rapide · Crise prioritaire
                    </Text>
                  </View>

                  <View style={styles.trialBox}>
                    <Feather name="gift" size={14} color="#fbbf24" />
                    <Text style={styles.trialText} numberOfLines={2}>
                      14 jours gratuits · Sans carte bancaire · Annulable à tout moment
                    </Text>
                  </View>
                </>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={({ pressed }) => [styles.registerButton, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.registerButtonText} numberOfLines={1} adjustsFontSizeToFit>
                  {loading
                    ? "Création du compte..."
                    : isOrg
                    ? "Commencer mon essai gratuit"
                    : "Créer mon compte"}
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.footerLink}>Se connecter</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.disclaimerRow, { opacity: fadeAnim }]}>
              <Text style={styles.disclaimer}>En continuant, vous acceptez nos </Text>
              <Pressable onPress={() => router.push("/legal" as any)}>
                <Text style={styles.disclaimerLink}>
                  conditions d'utilisation et notre politique de confidentialité
                </Text>
              </Pressable>
              <Text style={styles.disclaimer}>.</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  /* Step 1 — choice cards */
  choiceWrap: {
    gap: 14,
    marginTop: 4,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  choiceIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  choiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  choiceTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    flexShrink: 1,
  },
  choicePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  choicePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.4,
  },
  choiceDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
    marginTop: 4,
  },
  choicePerks: {
    marginTop: 6,
    gap: 2,
  },
  choicePerk: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.95)",
  },

  /* Step 2 — form */
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 12,
  },
  row: { flexDirection: "row", gap: 10 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 13 : 2,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  eyeBtn: { padding: 4 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 2,
  },
  planSummary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  planSummaryHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  planSummaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planSummaryPrice: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planSummaryNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 16,
  },
  proSuggestion: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(251,191,36,0.14)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.4)",
    borderRadius: 12,
    padding: 12,
  },
  proSuggestionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fef3c7",
  },
  proSuggestionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(254,243,199,0.85)",
    lineHeight: 16,
    marginTop: 3,
  },
  proSuggestionBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  proSuggestionBtnPrimary: {
    backgroundColor: "#fbbf24",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  proSuggestionBtnPrimaryText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#1f1300",
  },
  proSuggestionBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  proSuggestionBtnSecondaryText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  trialBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trialText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#fef3c7",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#ff6b6b",
    flex: 1,
  },
  registerButton: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0e7e6e",
  },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    textDecorationLine: "underline",
  },
  disclaimerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 18,
  },
  disclaimerLink: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
    lineHeight: 18,
  },
});
