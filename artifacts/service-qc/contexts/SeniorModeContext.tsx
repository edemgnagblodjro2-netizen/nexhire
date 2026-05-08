import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "attentezero_senior_mode";

type SeniorModeContextValue = {
  seniorMode: boolean;
  toggleSeniorMode: () => void;
  setSeniorMode: (v: boolean) => void;
};

const SeniorModeContext = createContext<SeniorModeContextValue>({
  seniorMode: false,
  toggleSeniorMode: () => {},
  setSeniorMode: () => {},
});

export function SeniorModeProvider({ children }: { children: React.ReactNode }) {
  const [seniorMode, setSeniorModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "1") setSeniorModeState(true);
      })
      .catch(() => {});
  }, []);

  const setSeniorMode = useCallback((v: boolean) => {
    setSeniorModeState(v);
    AsyncStorage.setItem(STORAGE_KEY, v ? "1" : "0").catch(() => {});
  }, []);

  const toggleSeniorMode = useCallback(() => {
    setSeniorModeState((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});
      return next;
    });
  }, []);

  return (
    <SeniorModeContext.Provider value={{ seniorMode, toggleSeniorMode, setSeniorMode }}>
      {children}
    </SeniorModeContext.Provider>
  );
}

export function useSeniorMode() {
  return useContext(SeniorModeContext);
}

/** Renvoie un facteur d'échelle (1 ou 1.3) pour agrandir les éléments en Mode Senior. */
export function useSeniorScale(): number {
  const { seniorMode } = useContext(SeniorModeContext);
  return seniorMode ? 1.3 : 1;
}
