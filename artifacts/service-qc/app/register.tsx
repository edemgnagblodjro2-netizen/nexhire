import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
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
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useAuth, type UserRole } from "@/lib/auth";

// v1.1.8 — Self-signup re-enabled for Organisme & Partenaire.
// Three account types are offered up front: Citoyen (default), Organisme
// (community org / OBNL with public listing) and Partenaire (institutional
// supporter / donor). Backend route /api/mobile-auth/register accepts the
// role + organisation fields and creates the right rows in users/orgs/subs.

type AccountType = "user" | "organisme" | "partenaire";

const TYPE_OPTIONS: {
  id: AccountType;
  emoji: string;
  label: string;
  blurb: string;
}[] = [
  {
    id: "user",
    emoji: "👤",
    label: "Citoyen",
    blurb: "Trouver de l'aide près de chez moi",
  },
  {
    id: "organisme",
    emoji: "🏢",
    label: "Organisme",
    blurb: "OBNL, organisme communautaire, clinique",
  },
  {
    id: "partenaire",
    emoji: "🤝",
    label: "Partenaire",
    blurb: "Institution, donateur, soutien financier",
  },
];

export default function RegisterScreen() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();

  // Type d'inscription — peut être préselectionné via deep-link (?type=organisme).
  const [accountType, setAccountType] = useState<AccountType>(() => {
    const t = params.type;
    if (t === "organisme" || t === "partenaire") return t;
    return "user";
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Champs spécifiques Organisme / Partenaire
  const [organisationName, setOrganisationName] = useState("");
  const [organisationCity, setOrganisationCity] = useState("");
  const [organisationPhone, setOrganisationPhone] = useState("");
  const [organisationWebsite, setOrganisationWebsite] = useState("");

  // ─── Anti-bot : captcha math signé HMAC + honeypot silencieux ───
  // Affiché seulement pour Organisme/Partenaire. Le honeypot (champ caché)
  // est envoyé pour TOUS les types ; un bot qui auto-remplit déclenche le piège.
  const [captchaQuestion, setCaptchaQuestion] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaAnswer, setCaptchaAnswer] = useState<string>("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [honeypot, setHoneypot] = useState<string>(""); // jamais visible

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const isOrgType = accountType === "organisme" || accountType === "partenaire";

  // Récupère un nouveau défi captcha quand l'utilisateur sélectionne Org/Partenaire.
  async function fetchCaptcha() {
    try {
      setCaptchaLoading(true);
      const { getApiBaseUrl } = await import("@/lib/apiBase");
      const res = await fetch(`${getApiBaseUrl()}/api/captcha/challenge`);
      const data = await res.json();
      if (data?.token && data?.question) {
        setCaptchaQuestion(String(data.question));
        setCaptchaToken(String(data.token));
        setCaptchaAnswer("");
      }
    } catch {
      // En cas d'erreur réseau, on laisse le champ vide ; le serveur renverra
      // un message clair lors de la soumission.
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => {
    if (isOrgType && !captchaToken) {
      fetchCaptcha();
    }
  }, [isOrgType]);

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (isOrgType && !organisationName.trim()) {
      setError(
        accountType === "organisme"
          ? "Veuillez indiquer le nom de votre organisme."
          : "Veuillez indiquer le nom de votre institution.",
      );
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
    if (isOrgType && (!captchaToken || !captchaAnswer.trim())) {
      setError("Veuillez répondre à la question de vérification.");
      return;
    }

    setError(null);
    setLoading(true);

    const role: UserRole = accountType;
    const orgInfo = isOrgType
      ? {
          organisationName: organisationName.trim(),
          organisationCity: organisationCity.trim() || undefined,
          organisationPhone: organisationPhone.trim() || undefined,
          organisationWebsite: organisationWebsite.trim() || undefined,
        }
      : undefined;

    const captchaPayload = isOrgType
      ? { token: captchaToken, answer: captchaAnswer.trim(), honeypot }
      : { token: "", answer: "", honeypot }; // honeypot quand même, mais pas de token

    const result = await register(
      email.trim().toLowerCase(),
      password,
      firstName.trim(),
      lastName.trim(),
      address.trim() || undefined,
      role,
      orgInfo,
      isOrgType ? captchaPayload : { token: "", answer: "", honeypot },
    );

    if (result.error) {
      setLoading(false);
      setError(result.error);
      // Sur erreur captcha, on regénère automatiquement.
      if (isOrgType && /captcha|vérification|anti-bot|trop rapide/i.test(result.error)) {
        fetchCaptcha();
      }
      return;
    }

    setLoading(false);
  }

  const planSummary = (() => {
    switch (accountType) {
      case "organisme":
        return {
          title: "Compte Organisme",
          price: "Gratuit · 14 j d'essai",
          note: "Badge vérifié · édition de votre fiche · stats de vues · mise en avant. Forfait à vie 149,99 $ (optionnel).",
        };
      case "partenaire":
        return {
          title: "Compte Partenaire",
          price: "Gratuit · 14 j d'essai",
          note: "Reconnaissance publique · accès anticipé · code promo · support 24h. Forfait à vie 299,99 $ (optionnel).",
        };
      default:
        return {
          title: "Compte citoyen",
          price: "Gratuit",
          note: "Recherche illimitée · SOS · Carte · Chat IA · Premium 10 $ optionnel à vie",
        };
    }
  })();

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
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#ffffff" />
              </Pressable>
              <View style={styles.flex}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                  Créer un compte
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  Inscription gratuite, sans carte
                </Text>
              </View>
            </Animated.View>

            {/* ─── Sélecteur de type de compte ─── */}
            <Animated.View
              style={[styles.typeRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              {TYPE_OPTIONS.map((opt) => {
                const active = accountType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setAccountType(opt.id);
                      setError(null);
                    }}
                    style={[
                      styles.typeCard,
                      active && styles.typeCardActive,
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                    <Text style={styles.typeLabel} numberOfLines={1} adjustsFontSizeToFit>
                      {opt.label}
                    </Text>
                    <Text style={styles.typeBlurb} numberOfLines={2}>
                      {opt.blurb}
                    </Text>
                  </Pressable>
                );
              })}
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
                  placeholder={isOrgType ? "Courriel professionnel" : "Adresse courriel"}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>

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

              {/* ─── Champs Organisme / Partenaire ─── */}
              {isOrgType && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>
                      {accountType === "organisme" ? "Votre organisme" : "Votre institution"}
                    </Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather
                      name={accountType === "organisme" ? "home" : "briefcase"}
                      size={16}
                      color="rgba(255,255,255,0.7)"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={
                        accountType === "organisme"
                          ? "Nom de l'organisme (OBNL, clinique...)"
                          : "Nom de l'institution / partenaire"
                      }
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={organisationName}
                      onChangeText={setOrganisationName}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputWrapper, styles.flex]}>
                      <Feather name="map" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Ville"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={organisationCity}
                        onChangeText={setOrganisationCity}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                    <View style={[styles.inputWrapper, styles.flex]}>
                      <Feather name="phone" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Téléphone"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={organisationPhone}
                        onChangeText={setOrganisationPhone}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="globe" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Site web (optionnel)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={organisationWebsite}
                      onChangeText={setOrganisationWebsite}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="next"
                    />
                  </View>
                </>
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
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>

              {/* ─── Captcha math (Organisme/Partenaire seulement) ─── */}
              {isOrgType && (
                <View style={styles.captchaBox}>
                  <View style={styles.captchaHead}>
                    <Feather name="shield" size={14} color="#ffffff" />
                    <Text style={styles.captchaLabel}>Vérification anti-robot</Text>
                  </View>
                  <View style={styles.captchaRow}>
                    <Text style={styles.captchaQuestion}>
                      {captchaLoading || !captchaQuestion ? "Chargement..." : `${captchaQuestion} = ?`}
                    </Text>
                    <TextInput
                      style={styles.captchaInput}
                      placeholder="Réponse"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={captchaAnswer}
                      onChangeText={setCaptchaAnswer}
                      keyboardType="number-pad"
                      maxLength={3}
                      editable={!captchaLoading && !!captchaQuestion}
                    />
                    <Pressable onPress={fetchCaptcha} style={styles.captchaRefresh} disabled={captchaLoading}>
                      <Feather name="refresh-cw" size={14} color="rgba(255,255,255,0.85)" />
                    </Pressable>
                  </View>
                  <Text style={styles.captchaHint}>
                    Une simple addition pour confirmer que vous n'êtes pas un robot.
                  </Text>
                </View>
              )}

              {/* Honeypot — invisible aux humains, piège pour bots qui auto-remplissent */}
              <View style={styles.honeypot} pointerEvents="none">
                <TextInput
                  value={honeypot}
                  onChangeText={setHoneypot}
                  autoComplete="off"
                  importantForAutofill="no"
                  accessibilityElementsHidden
                />
              </View>

              {/* Free / Premium summary */}
              <View style={styles.planSummary}>
                <View style={styles.planSummaryHead}>
                  <Text style={styles.planSummaryTitle}>{planSummary.title}</Text>
                  <Text style={styles.planSummaryPrice}>{planSummary.price}</Text>
                </View>
                <Text style={styles.planSummaryNote} numberOfLines={3}>
                  {planSummary.note}
                </Text>
              </View>

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
                    : accountType === "organisme"
                    ? "Créer mon compte Organisme"
                    : accountType === "partenaire"
                    ? "Créer mon compte Partenaire"
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
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  // ─── Sélecteur de type ───
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 96,
  },
  typeCardActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "#ffffff",
  },
  typeEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  typeLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  typeBlurb: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
    lineHeight: 13,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  row: { flexDirection: "row", gap: 10 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 6 },
  // ─── Divider section organisme ───
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  dividerLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // ─── Captcha ───
  captchaBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  captchaHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  captchaLabel: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  captchaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  captchaQuestion: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flexShrink: 0,
  },
  captchaInput: {
    flex: 1,
    minWidth: 0,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  captchaRefresh: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  captchaHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    lineHeight: 14,
  },
  // Honeypot caché (hors écran). Surface large pour bots, invisible pour humains.
  honeypot: {
    position: "absolute",
    left: -10000,
    top: -10000,
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0,
  },
  planSummary: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    gap: 4,
  },
  planSummaryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planSummaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  planSummaryPrice: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  planSummaryNote: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.4)",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  registerButtonText: {
    color: "#0a6558",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  footerText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  footerLink: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  disclaimerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 4,
  },
  disclaimer: { color: "rgba(255,255,255,0.6)", fontSize: 11, lineHeight: 16 },
  disclaimerLink: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: "underline",
  },
});
