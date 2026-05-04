import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import FloatingAIChat from "@/components/FloatingAIChat";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { t } = useLanguage();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: isWeb ? 4 : 0,
          includeFontPadding: false,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingTop: 4,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t.tabChat,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={
                focused
                  ? {
                      backgroundColor: colors.primary,
                      borderRadius: 14,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginBottom: 2,
                    }
                  : undefined
              }
            >
              <Feather name="cpu" size={21} color={focused ? "#fff" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t.tabServices,
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Carte",
          tabBarIcon: ({ color }) => (
            <Feather name="map-pin" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
          title: t.tabCategories,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",
          tabBarIcon: ({ color }) => (
            <Feather name="more-horizontal" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: t.tabProfile,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <>
      <ClassicTabLayout />
      <FloatingAIChat />
    </>
  );
}
