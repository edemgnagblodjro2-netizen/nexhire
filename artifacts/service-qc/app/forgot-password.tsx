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
import { useRouter } from "expo-router";

import { getApiBaseUrl } from "@/lib/apiBase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleSubmit() {
    if (!email.trim()) {
      setError("Veuillez entrer votre adresse courriel.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/mobile-auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
      } else {
        // The server sends the reset token by email — it is never returned in the API
        // response. Show confirmation and let the user proceed to the reset screen.
        setCode("sent");
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
                <Text style={styles.title}>Mot de passe oublié</Text>
                <Text style={styles.subtitle}>Entrez votre adresse courriel</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {!code ? (
                <>
                  <Text style={styles.instructions}>
                    Entrez l'adresse courriel associée à votre compte. Un code de réinitialisation vous sera fourni.
                  </Text>

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
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>

                  {error && (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={14} color="#ff6b6b" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={loading}
                    style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.submitBtnText}>
                      {loading ? "Envoi..." : "Obtenir un code"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.successIcon}>
                    <Feather name="check-circle" size={40} color="#4ade80" />
                  </View>
                  <Text style={styles.codeLabel}>Vérifiez votre courriel</Text>
                  <Text style={styles.codeNote}>
                    Si un compte existe pour cette adresse, un lien de réinitialisation vous a été envoyé.{"\n\n"}
                    Copiez le code de réinitialisation depuis le courriel et collez-le dans l'écran suivant.{"\n"}
                    Le code est valide 15 minutes.
                  </Text>
                  <Pressable
                    onPress={() => router.push({ pathname: "/reset-password", params: { email } })}
                    style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.submitBtnText}>Continuer</Text>
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
  instructions: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)", lineHeight: 21,
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
  codeLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center" },
  codeBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, paddingVertical: 18, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  codeText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#ffffff", letterSpacing: 8 },
  codeNote: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 20,
  },
});
