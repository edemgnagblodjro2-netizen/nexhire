import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "premium_gate_attempts";
const FREE_USES = 3;

export function usePremiumGate() {
  const [attempts, setAttempts] = useState(0);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setAttempts(parseInt(val, 10));
    });
  }, []);

  const recordAttempt = useCallback(async () => {
    const next = attempts + 1;
    setAttempts(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
    // Show gate on the 3rd use AND every subsequent tap — the modal is the reminder
    if (next >= FREE_USES) {
      setShowGate(true);
      return true;
    }
    return false;
  }, [attempts]);

  // Call this when the user visits the "Plus" tab while already gated
  const checkAndRemind = useCallback(() => {
    if (attempts >= FREE_USES) {
      setShowGate(true);
    }
  }, [attempts]);

  const dismissGate = useCallback(() => setShowGate(false), []);

  const resetGate = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAttempts(0);
    setShowGate(false);
  }, []);

  return {
    attempts,
    remaining: Math.max(0, FREE_USES - attempts),
    isGated: attempts >= FREE_USES,
    showGate,
    recordAttempt,
    checkAndRemind,
    dismissGate,
    resetGate,
  };
}
