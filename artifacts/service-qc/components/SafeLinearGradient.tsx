import React from "react";
import { View, ViewProps, StyleProp, ViewStyle } from "react-native";

interface LinearGradientProps extends ViewProps {
  colors: readonly string[] | string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[] | number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function LinearGradient({
  colors,
  style,
  children,
  start: _start,
  end: _end,
  locations: _locations,
  ...rest
}: LinearGradientProps) {
  const fallbackColor = (colors && colors[0]) || "transparent";
  return (
    <View style={[{ backgroundColor: fallbackColor }, style]} {...rest}>
      {children}
    </View>
  );
}
