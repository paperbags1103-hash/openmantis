import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SettingsState = {
  serverUrl: string;
  locationEnabled: boolean;
  pushEnabled: boolean;
  connectionStatus: "unknown" | "connected" | "error";
  setServerUrl: (url: string) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setPushEnabled: (enabled: boolean) => void;
  setConnectionStatus: (status: "unknown" | "connected" | "error") => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: "http://192.168.219.126:3002",
      locationEnabled: false,
      pushEnabled: false,
      connectionStatus: "unknown",
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLocationEnabled: (locationEnabled) => set({ locationEnabled }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
    }),
    {
      name: "openmantis-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialState: (state: SettingsState) => ({ serverUrl: state.serverUrl }),
    } as any
  )
);

export default useSettingsStore;
