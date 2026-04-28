import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter, setBaseUrl } from "@/lib/apiClient";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ServicesProvider } from "@/contexts/ServicesContext";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://quebec-aid-finder.replit.app";
if (domain) {
  setBaseUrl(`https://${domain}`);
} else {
  setBaseUrl(apiUrl);
}
setAuthTokenGetter(() => SecureStore.getItemAsync("auth_session_token"));

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppContent({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [splashVisible, setSplashVisible] = useState(true);
  const wasAuthenticated = useRef(false);

  const isReady = fontsReady && !isLoading;

  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => setSplashVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => setSplashVisible(false), 4000);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticated.current = true;
    } else if (wasAuthenticated.current && !isLoading) {
      wasAuthenticated.current = false;
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  const handleInactivityTimeout = useCallback(async () => {
    await logout();
  }, [logout]);

  const { resetTimer } = useInactivityTimer(
    handleInactivityTimeout,
    isAuthenticated
  );

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={() => {
        resetTimer();
        return false;
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
        <Stack.Screen name="urgent" options={{ headerShown: false }} />
        <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="buying-guide" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="sos" options={{ headerShown: false }} />
        <Stack.Screen name="diagnostic" options={{ headerShown: false }} />
        <Stack.Screen name="bug-report" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="whats-new" options={{ headerShown: false }} />
        <Stack.Screen name="ambassador" options={{ headerShown: false }} />
      </Stack>
      <AppSplashScreen visible={splashVisible} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <LanguageProvider>
                  <LocationProvider>
                    <ServicesProvider>
                      <AppContent fontsReady={fontsReady} />
                    </ServicesProvider>
                  </LocationProvider>
                </LanguageProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
