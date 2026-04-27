import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1 }} />;
  }

  return <Redirect href="/(tabs)" />;
}
