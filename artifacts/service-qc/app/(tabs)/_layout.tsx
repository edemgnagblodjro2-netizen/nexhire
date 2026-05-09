import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import FloatingAIChat from "@/components/FloatingAIChat";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

const TAB_BG = "#0d9488";
const TAB_BG_TOP_BORDER = "rgba(255,255,255,0.08)";
const TAB_ACTIVE = "#FFFFFF";
const TAB_INACTIVE = "rgba(255,255,255,0.62)";
const TAB_ACTIVE_PILL_BG = "rgba(255,255,255,0.18)";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={[
        styles.iconPill,
        focused && styles.iconPillActive,
      ]}
    >
      <Feather name={name} size={20} color={color} />
    </View>
  );
}

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
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: TAB_BG_TOP_BORDER,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          overflow: "hidden",
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: TAB_BG,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginBottom: isWeb ? 4 : 0,
          includeFontPadding: false,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingTop: 6,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t.tabChat,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cpu" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t.tabServices,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Carte",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-pin" color={color} focused={focused} />
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="more-horizontal" color={color} focused={focused} />
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

const styles = StyleSheet.create({
  iconPill: {
    minWidth: 44,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: "transparent",
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: TAB_ACTIVE_PILL_BG,
  },
});

export default function TabLayout() {
  return (
    <>
      <ClassicTabLayout />
      <FloatingAIChat />
    </>
  );
}
