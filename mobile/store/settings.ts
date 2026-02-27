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

// 아부지 Mac mini IP — Settings에서 변경 가능
const DEFAULT_SERVER_URL = "http://192.168.219.126:3002";

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
