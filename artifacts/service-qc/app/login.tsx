import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
import { useServicesData } from "@/contexts/ServicesContext";

const { width: SW } = Dimensions.get("window");

function FloatingOrb({
  size,
  top,
  left,
  delay,
  opacity: baseOpacity,
}: {
  size: number;
  top: number | string;
  left: number | string;
  delay: number;
  opacity: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3200, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [baseOpacity, baseOpacity * 1.6, baseOpacity] });
  return (
    <Animated.View
      style={[{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        transform: [{ translateY }],
        opacity,
      }, { top: top as any, left: left as any }]}
    />
  );
}

export default function LoginScreen() {
  const { loginWithEmail, isAuthenticated } = useAuth();
  const router = useRouter();
  const { services } = useServicesData();
  const roundedCount = Math.max(100, Math.floor(services.length / 10) * 10);

  const FEATURES = [
    { icon: "map-pin" as const, label: `${roundedCount}+ services` },
    { icon: "cpu" as const, label: "IA multilingue" },
    { icon: "phone-call" as const, label: "SOS urgences" },
  ];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(20)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(badgeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(badgeSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
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
    <LinearGradient colors={["#074d43", "#0e7e6e", "#1a9f8c"]} style={styles.gradient}>

      <FloatingOrb size={180} top="2%" left="-12%" delay={0} opacity={0.18} />
      <FloatingOrb size={110} top="8%" left="72%" delay={600} opacity={0.14} />
      <FloatingOrb size={70}  top="35%" left="80%" delay={1200} opacity={0.1} />
      <FloatingOrb size={140} top="62%" left="-8%" delay={400} opacity={0.12} />
      <FloatingOrb size={90}  top="78%" left="68%" delay={900} opacity={0.1} />

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
            {/* ── Logo ── */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
              <View style={styles.logoRing}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require("@/assets/images/icon.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </Animated.View>

            {/* ── App name + tagline ── */}
            <Animated.View style={[styles.textBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.appName}>AttenteZéro</Text>
              <Text style={styles.tagline}>Services communautaires du Québec</Text>
            </Animated.View>

            {/* ── Feature pills ── */}
            <Animated.View style={[styles.pillsRow, { opacity: badgeOpacity, transform: [{ translateY: badgeSlide }] }]}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.pill}>
                  <Feather name={f.icon} size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.pillText}>{f.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* ── Form card ── */}
            <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.formTitle}>Connexion</Text>

              <View style={styles.inputWrapper}>
                <Feather name="mail" size={17} color="rgba(255,255,255,0.65)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse courriel"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Feather name="lock" size={17} color="rgba(255,255,255,0.65)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={8}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={17} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </View>

              <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </Pressable>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.88 }]}
              >
                {loading ? (
                  <Text style={styles.loginButtonText}>Connexion…</Text>
                ) : (
                  <>
                    <Feather name="log-in" size={18} color="#0e7e6e" />
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
                <Feather name="user-plus" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.registerButtonText}>Créer un compte</Text>
              </Pressable>
            </Animated.View>

            {/* ── Disclaimer ── */}
            <Animated.View style={[styles.disclaimerRow, { opacity: fadeAnim }]}>
              <Text style={styles.disclaimer}>En continuant, vous acceptez nos </Text>
              <Pressable onPress={() => router.push("/legal" as any)}>
                <Text style={styles.disclaimerLink}>conditions d'utilisation</Text>
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
    paddingHorizontal: Math.min(24, SW * 0.06),
    paddingVertical: 20,
    gap: 14,
  },

  /* Floating orbs */
  orb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  /* Logo */
  logoContainer: { marginBottom: 2 },
  logoRing: {
    padding: 5,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 14 }
      : { elevation: 10 }),
  },
  logoImage: { width: 74, height: 74, borderRadius: 18 },

  /* Text block */
  textBlock: { alignItems: "center", gap: 4 },
  appName: {
    fontSize: Math.min(28, SW * 0.075),
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },

  /* Feature pills */
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },

  /* Form card */
  formCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 13 : 2,
  },
  inputIcon: { marginRight: 9 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: "flex-end" },
  forgotText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#ff6b6b",
    flex: 1,
  },
  loginButton: {
    backgroundColor: "#ffffff",
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 2,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  loginButtonText: {
    fontSize: 15,
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
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 13,
    paddingVertical: 13,
  },
  registerButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },

  /* Disclaimer */
  disclaimerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 16,
  },
  disclaimerLink: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
    lineHeight: 16,
  },
});
