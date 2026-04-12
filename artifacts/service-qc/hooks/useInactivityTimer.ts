import { useEffect, useRef, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";

const INACTIVITY_MS = 7 * 60 * 1000; // 7 minutes

export function useInactivityTimer(
  onTimeout: () => void,
  isActive: boolean
): { resetTimer: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    if (!isActive) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, INACTIVITY_MS);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    resetTimer();

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        resetTimer();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);

    return () => {
      sub.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, resetTimer]);

  return { resetTimer };
}
