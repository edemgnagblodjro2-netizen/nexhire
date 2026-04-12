import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import type { Category } from "@/data/services";
import { CATEGORY_LABELS } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";

interface CategoryChipProps {
  category: Category;
  selected?: boolean;
  onPress: (category: Category) => void;
}

export function CategoryChip({
  category,
  selected = false,
  onPress,
}: CategoryChipProps) {
  const colors = useColors();
  const color = getCategoryColor(category, colors);
  const icon = CATEGORY_ICONS[category] as keyof typeof Feather.glyphMap;

  function handlePress() {
    Haptics.selectionAsync();
    onPress(category);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? color : colors.card,
          borderColor: selected ? color : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <Feather
        name={icon}
        size={14}
        color={selected ? "#fff" : color}
      />
      <Text
        style={[
          styles.label,
          { color: selected ? "#fff" : colors.foreground },
        ]}
      >
        {CATEGORY_LABELS[category]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
