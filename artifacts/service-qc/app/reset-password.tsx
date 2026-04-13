import React, { useRef, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getApiBaseUrl } from "@/lib/apiBase";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email: paramEmail } = useLocalSearchParams<{ email: string }>();

  const [email, setEmail] = useState(paramEmail ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleReset() {
    if (!email.trim() || !code.trim() || !newPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/mobile-auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#0a6558", "#0e7e6e", "#1a9f8c"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#ffffff" />
              </Pressable>
              <View>
                <Text style={styles.title}>Nouveau mot de passe</Text>
                <Text style={styles.subtitle}>Entrez votre code et choisissez un nouveau mot de passe</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {!success ? (
                <>
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
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="hash" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Code à 6 chiffres"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={code}
                      onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={16} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Nouveau mot de passe (min. 6 car.)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={newPassword}
                      onChangeText={setNewPassword}
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
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Confirmer le mot de passe"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleReset}
                    />
                  </View>

                  {error && (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={14} color="#ff6b6b" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={handleReset}
                    disabled={loading}
                    style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.submitBtnText}>
                      {loading ? "Mise à jour..." : "Changer le mot de passe"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.successIcon}>
                    <Feather name="check-circle" size={48} color="#4ade80" />
                  </View>
                  <Text style={styles.successTitle}>Mot de passe mis à jour !</Text>
                  <Text style={styles.successText}>
                    Votre mot de passe a été changé avec succès. Vous pouvez maintenant vous connecter.
                  </Text>
                  <Pressable
                    onPress={() => router.replace("/login")}
                    style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.submitBtnText}>Se connecter</Text>
                  </Pressable>
                </>
              )}
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#ffffff" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    gap: 14,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 13 : 2,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff" },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff6b6b", flex: 1 },
  submitBtn: {
    backgroundColor: "#ffffff", borderRadius: 14,
    paddingVertical: 15, alignItems: "center", justifyContent: "center",
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0e7e6e" },
  successIcon: { alignItems: "center", paddingTop: 8 },
  successTitle: {
    fontSize: 20, fontFamily: "Inter_700Bold", color: "#ffffff",
    textAlign: "center",
  },
  successText: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 21,
  },
});
