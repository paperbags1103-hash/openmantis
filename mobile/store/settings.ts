import { create } from "zustand";

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

const DEFAULT_SERVER_URL = "";

export const useSettingsStore = create<SettingsState>((set) => ({
  serverUrl: DEFAULT_SERVER_URL,
  locationEnabled: false,
  pushEnabled: false,
  connectionStatus: "unknown",
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setLocationEnabled: (locationEnabled) => set({ locationEnabled }),
  setPushEnabled: (pushEnabled) => set({ pushEnabled }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));

export default useSettingsStore;
