import { useCallback } from "react";
import { useAuth } from "@/lib/auth";

export function usePremiumGate() {
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;

  const recordAttempt = useCallback(async () => false, []);
  const checkAndRemind = useCallback(() => {}, []);
  const dismissGate = useCallback(() => {}, []);
  const resetGate = useCallback(async () => {}, []);

  return {
    attempts: 0,
    remaining: Infinity,
    isGated: false,
    isPremium,
    showGate: false,
    recordAttempt,
    checkAndRemind,
    dismissGate,
    resetGate,
  };
}
