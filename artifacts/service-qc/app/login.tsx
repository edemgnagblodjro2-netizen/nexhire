import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { loginWithEmail, isAuthenticated } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError(null);
    setLoading(true);
    const err = await loginWithEmail(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) setError(err);
  }

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
              style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}
            >
              <View style={styles.logoCircle}>
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.textBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <Text style={styles.appName}>AttenteZéro</Text>
              <Text style={styles.tagline}>Services communautaires du Québec</Text>
            </Animated.View>

            <Animated.View
              style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
              <Text style={styles.formTitle}>Connexion</Text>

              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
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

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </Pressable>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}
              >
                {loading ? (
                  <Text style={styles.loginButtonText}>Connexion...</Text>
                ) : (
                  <>
                    <Feather name="log-in" size={20} color="#0e7e6e" />
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => router.push("/register")}
                style={({ pressed }) => [styles.registerButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.registerButtonText}>Créer un compte</Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },
  logoContainer: { marginBottom: 4 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 }
      : { elevation: 12 }),
  },
  logoImage: { width: 86, height: 86, borderRadius: 22 },
  textBlock: { alignItems: "center" },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  formCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 14,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 2,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: "flex-end" },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textDecorationLine: "underline",
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
  loginButton: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  loginButtonPressed: { opacity: 0.85 },
  loginButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0e7e6e",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  registerButton: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  disclaimerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
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
