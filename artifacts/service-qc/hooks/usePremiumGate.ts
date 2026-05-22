import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/revenuecat";

const STORAGE_KEY = "premium_gate_attempts";
const STORAGE_DAY_KEY = "premium_gate_day";
const FREE_USES = 3;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function usePremiumGate() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  // Sur iOS : vérifié via RevenueCat IAP (entitlement "premium")
  // Sur Android/Web : vérifié via le champ isPremium de la base de données (Stripe)
  const isPremium = Platform.OS === "ios" ? isSubscribed : !!user?.isPremium;

  const [attempts, setAttempts] = useState(0);
  const [showGate, setShowGate] = useState(false);

  // Load + reset daily
  useEffect(() => {
    (async () => {
      const today = todayKey();
      const storedDay = await AsyncStorage.getItem(STORAGE_DAY_KEY);
      if (storedDay !== today) {
        await AsyncStorage.setItem(STORAGE_DAY_KEY, today);
        await AsyncStorage.setItem(STORAGE_KEY, "0");
        setAttempts(0);
        return;
      }
      const val = await AsyncStorage.getItem(STORAGE_KEY);
      if (val) setAttempts(parseInt(val, 10) || 0);
    })();
  }, []);

  // If user becomes Premium, immediately dismiss any visible gate
  useEffect(() => {
    if (isPremium && showGate) setShowGate(false);
  }, [isPremium, showGate]);

  const recordAttempt = useCallback(async (): Promise<boolean> => {
    if (isPremium) return false;
    const next = attempts + 1;
    setAttempts(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
    await AsyncStorage.setItem(STORAGE_DAY_KEY, todayKey());
    if (next > FREE_USES) {
      setShowGate(true);
      return true;
    }
    return false;
  }, [attempts, isPremium]);

  const checkAndRemind = useCallback(() => {
    if (isPremium) return;
    if (attempts >= FREE_USES) {
      setShowGate(true);
    }
  }, [attempts, isPremium]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const resetGate = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(STORAGE_DAY_KEY);
    setAttempts(0);
    setShowGate(false);
  }, []);

  return {
    attempts,
    remaining: isPremium ? Infinity : Math.max(0, FREE_USES - attempts),
    isGated: !isPremium && attempts >= FREE_USES,
    isPremium,
    showGate: !isPremium && showGate,
    recordAttempt,
    checkAndRemind,
    dismissGate,
    resetGate,
  };
}
