import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORY_LABELS, URGENT_SERVICES, type Service } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";

function UrgentServiceItem({ service }: { service: Service }) {
  const colors = useColors();
  const router = useRouter();
  const categoryColor = getCategoryColor(service.category, colors);

  function handleCall() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${service.phone.replace(/\s/g, "")}`);
  }

  function handleDetails() {
    Haptics.selectionAsync();
    router.push({
      pathname: "/service/[id]",
      params: { id: service.id },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.urgentCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.93 : 1,
        },
      ]}
      onPress={handleDetails}
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: categoryColor },
          ]}
        />
        <View style={styles.cardText}>
          <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={2}>
            {service.name}
          </Text>
          <Text style={[styles.serviceCategory, { color: colors.mutedForeground }]}>
            {CATEGORY_LABELS[service.category]} · {service.city}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.callBtn, { backgroundColor: colors.urgent }]}
        onPress={handleCall}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <Feather name="phone" size={16} color="#fff" />
      </TouchableOpacity>
    </Pressable>
  );
}

export default function UrgentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.urgent,
            paddingTop: topPadding + 8,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Aide d'urgence</Text>
          <Text style={styles.headerSub}>
            {URGENT_SERVICES.length} services disponibles maintenant
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.alertBanner,
          { backgroundColor: colors.urgentLight, borderColor: colors.urgent + "30" },
        ]}
      >
        <Feather name="alert-circle" size={18} color={colors.urgent} />
        <Text style={[styles.alertText, { color: colors.urgent }]}>
          En cas de danger immédiat, composez le{" "}
          <Text style={styles.alertPhone}>911</Text>
        </Text>
      </View>

      <FlatList
        data={URGENT_SERVICES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <UrgentServiceItem service={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 20,
  },
  alertPhone: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  list: {
    padding: 16,
    paddingTop: 12,
    gap: 0,
  },
  urgentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  serviceCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    flexShrink: 0,
  },
});
