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

type Plan = "standard" | "plus";

export default function RegisterScreen() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("user");
  const [plan, setPlan] = useState<Plan>("standard");

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

  async function handleRegister() {
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
            plan,
          }
        : undefined,
    );

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    // Organisme: open Stripe checkout in browser (14-day free trial)
    if (role === "organisme" && result.organisationId) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/stripe/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            organisationId: result.organisationId,
            plan,
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

    setLoading(false);
  }

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
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#ffffff" />
              </Pressable>
              <View style={styles.flex}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Créer un compte</Text>
                <Text style={styles.subtitle} numberOfLines={1}>Rejoignez AttenteZéro</Text>
              </View>
            </Animated.View>

            {/* Role selector */}
            <Animated.View style={[styles.roleRow, { opacity: fadeAnim }]}>
              <Pressable
                style={[styles.roleBtn, !isOrg && styles.roleBtnActive]}
                onPress={() => setRole("user")}
              >
                <Feather name="user" size={16} color={!isOrg ? "#0e7e6e" : "rgba(255,255,255,0.8)"} />
                <Text style={[styles.roleText, !isOrg && styles.roleTextActive]}>Personne</Text>
              </Pressable>
              <Pressable
                style={[styles.roleBtn, isOrg && styles.roleBtnActive]}
                onPress={() => setRole("organisme")}
              >
                <Feather name="briefcase" size={16} color={isOrg ? "#0e7e6e" : "rgba(255,255,255,0.8)"} />
                <Text style={[styles.roleText, isOrg && styles.roleTextActive]}>Organisme</Text>
              </Pressable>
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
                  placeholder="Adresse courriel"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>

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

                  {/* Plan selector */}
                  <Text style={styles.sectionLabel}>Choisir votre formule</Text>
                  <View style={styles.planRow}>
                    <Pressable
                      style={[styles.planCard, plan === "standard" && styles.planCardActive]}
                      onPress={() => setPlan("standard")}
                    >
                      <Text style={styles.planTitle}>Standard</Text>
                      <Text style={styles.planPrice}>39 $/mois</Text>
                      <Text style={styles.planNote}>Profil + statistiques</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.planCard, plan === "plus" && styles.planCardActive]}
                      onPress={() => setPlan("plus")}
                    >
                      <View style={styles.planBadge}><Text style={styles.planBadgeText}>POPULAIRE</Text></View>
                      <Text style={styles.planTitle}>Plus</Text>
                      <Text style={styles.planPrice}>89 $/mois</Text>
                      <Text style={styles.planNote}>Mise en avant + badge</Text>
                    </Pressable>
                  </View>

                  <View style={styles.trialBox}>
                    <Feather name="gift" size={14} color="#fbbf24" />
                    <Text style={styles.trialText}>
                      Essai gratuit 14 jours · Sans carte bancaire requise
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
                <Text style={styles.registerButtonText}>
                  {loading
                    ? "Création du compte..."
                    : isOrg
                    ? "Commencer mon essai gratuit"
                    : "S'inscrire"}
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
                <Text style={styles.disclaimerLink}>conditions d'utilisation et notre politique de confidentialité</Text>
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
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  roleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  roleBtnActive: {
    backgroundColor: "#fff",
  },
  roleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  roleTextActive: {
    color: "#0e7e6e",
  },
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
  planRow: {
    flexDirection: "row",
    gap: 10,
  },
  planCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
    position: "relative",
  },
  planCardActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "#fff",
  },
  planTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planPrice: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  planNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  planBadge: {
    position: "absolute",
    top: -8,
    right: 8,
    backgroundColor: "#fbbf24",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#1f1300",
    letterSpacing: 0.5,
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
