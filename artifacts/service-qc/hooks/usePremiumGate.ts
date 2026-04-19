import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "premium_gate_attempts";
const FREE_USES = 3;

export function usePremiumGate() {
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;

  const [attempts, setAttempts] = useState(0);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setAttempts(parseInt(val, 10));
    });
  }, []);

  // If user becomes Premium, immediately dismiss any visible gate
  useEffect(() => {
    if (isPremium && showGate) setShowGate(false);
  }, [isPremium, showGate]);

  const recordAttempt = useCallback(async () => {
    // Premium users bypass gating entirely
    if (isPremium) return false;

    const next = attempts + 1;
    setAttempts(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
    if (next >= FREE_USES) {
      setShowGate(true);
      return true;
    }
    return false;
  }, [attempts, isPremium]);

  const checkAndRemind = useCallback(() => {
    if (isPremium) return; // never gate Premium users
    if (attempts >= FREE_USES) {
      setShowGate(true);
    }
  }, [attempts, isPremium]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const resetGate = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
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
