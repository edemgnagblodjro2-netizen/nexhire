import React, { useEffect, useState, useCallback } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";

import { getAvatarUri } from "@/lib/avatar";
import { useColors } from "@/hooks/useColors";

interface Props {
  firstName: string | null;
  lastName: string | null;
  size?: number;
  textColor?: string;
  bgColor?: string;
  style?: ViewStyle;
}

export function UserAvatar({
  firstName,
  lastName,
  size = 80,
  textColor,
  bgColor,
  style,
}: Props) {
  const colors = useColors();
  const [uri, setUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAvatarUri().then((u) => {
        if (alive) setUri(u);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  useEffect(() => {
    getAvatarUri().then(setUri);
  }, []);

  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || "?";

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bgColor ?? colors.primary,
  };

  if (uri) {
    return (
      <View style={[styles.base, containerStyle, style]}>
        <Image source={{ uri }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View style={[styles.base, styles.center, containerStyle, style]}>
      <Text
        style={[
          styles.initials,
          { fontSize: size * 0.38, color: textColor ?? "#ffffff" },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
});
