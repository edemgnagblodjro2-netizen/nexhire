import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "attentezero_onboarding_seen_v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // Silent
  }
}
