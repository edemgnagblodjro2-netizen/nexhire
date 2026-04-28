import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { type ProvinceCode } from "@/data/services";

interface UserProvinceContextValue {
  province: ProvinceCode;
  setProvince: (p: ProvinceCode) => void;
  loaded: boolean;
}

const UserProvinceContext = createContext<UserProvinceContextValue>({
  province: "QC",
  setProvince: () => {},
  loaded: false,
});

const STORAGE_KEY = "attentezero_user_province_v1";

const VALID_CODES: ProvinceCode[] = [
  "QC", "ON", "BC", "AB", "MB", "SK",
  "NB", "NS", "PE", "NL", "YT", "NT", "NU",
];

export function UserProvinceProvider({ children }: { children: React.ReactNode }) {
  const [province, setProvinceState] = useState<ProvinceCode>("QC");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val && VALID_CODES.includes(val as ProvinceCode)) {
          setProvinceState(val as ProvinceCode);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setProvince = useCallback((p: ProvinceCode) => {
    setProvinceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  return (
    <UserProvinceContext.Provider value={{ province, setProvince, loaded }}>
      {children}
    </UserProvinceContext.Provider>
  );
}

export function useUserProvince() {
  return useContext(UserProvinceContext);
}
