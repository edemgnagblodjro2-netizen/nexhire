import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function UrgentButton() {
  const colors = useColors();
  const router = useRouter();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/urgent");
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.urgent,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.iconWrap}>
        <Feather name="alert-circle" size={22} color="#fff" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Aide d'urgence</Text>
        <Text style={styles.subtitle}>Services disponibles maintenant</Text>
      </View>
      <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
});
