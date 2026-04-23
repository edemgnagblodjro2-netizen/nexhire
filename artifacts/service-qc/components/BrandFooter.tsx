import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  variant?: "light" | "dark";
  style?: any;
}

export function BrandFooter({ variant, style }: Props) {
  const colors = useColors();
  const isLight = variant === "light";
  const muted = isLight ? "rgba(255,255,255,0.55)" : colors.mutedForeground;
  const accent = isLight ? "rgba(255,255,255,0.85)" : colors.foreground;

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.text, { color: muted }]}>
        Built by{" "}
        <Text style={[styles.brand, { color: accent }]}>CivicAI</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
  },
  brand: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
});
