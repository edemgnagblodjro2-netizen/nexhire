import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "attentezero.avatar.v1";

export async function getAvatarUri(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function setAvatarUri(uri: string | null): Promise<void> {
  try {
    if (uri) await AsyncStorage.setItem(KEY, uri);
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
