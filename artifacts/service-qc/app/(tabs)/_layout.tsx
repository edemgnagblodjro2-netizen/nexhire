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

  const TAB_BG = "#0E7E6E";
  const TAB_BG_TOP_BORDER = "#0A6055";
  const TAB_ACTIVE = "#FFFFFF";
  const TAB_INACTIVE = "rgba(255,255,255,0.65)";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: TAB_BG_TOP_BORDER,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: TAB_BG },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginBottom: isWeb ? 4 : 0,
          includeFontPadding: false,
          letterSpacing: 0.2,
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
                      backgroundColor: "#FFFFFF",
                      borderRadius: 14,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginBottom: 2,
                    }
                  : undefined
              }
            >
              <Feather name="cpu" size={21} color={focused ? "#0E7E6E" : color} />
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
