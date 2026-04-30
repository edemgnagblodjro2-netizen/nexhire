import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { uploadPushToken } from "./analytics";

const TOKEN_KEY = "attentezero_push_token_v1";
const PERMISSION_ASKED_KEY = "attentezero_push_permission_asked_v1";

export async function hasAskedPushPermission(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function markPushPermissionAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "1");
  } catch {
    // Silent
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Registers for push notifications. Best-effort: if expo-notifications
 * is unavailable (web, dev shell) or permission denied, returns null.
 * The token is persisted in AsyncStorage so it can be uploaded to the
 * backend when the user authenticates.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    await markPushPermissionAsked();
    if (finalStatus !== "granted") return null;
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      undefined;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp.data ?? null;
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      // Best-effort : envoie le token au backend pour permettre l'envoi
      // de notifications ciblées depuis le panneau admin.
      void uploadPushToken(token);
    }
    return token;
  } catch {
    return null;
  }
}
