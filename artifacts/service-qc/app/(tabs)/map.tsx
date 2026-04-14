import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function MapWebFallback() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Carte des services</Text>
        <Text style={styles.headerSub}>Services communautaires du Québec</Text>
      </LinearGradient>
      <View style={styles.body}>
        <Feather name="smartphone" size={52} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Carte disponible sur mobile
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          La carte interactive avec épingles géolocalisées est disponible sur
          iOS et Android. Téléchargez l'app pour explorer les{" "}
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.primary }}>
            366 services
          </Text>{" "}
          autour de vous.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/services")}
          activeOpacity={0.85}
        >
          <Feather name="list" size={18} color="#fff" />
          <Text style={styles.btnText}>Voir tous les services</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/categories")}
          activeOpacity={0.85}
        >
          <Feather name="grid" size={18} color={colors.mutedForeground} />
          <Text style={[styles.btnOutlineText, { color: colors.mutedForeground }]}>
            Parcourir par catégorie
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnOutlineText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
