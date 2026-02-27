import { create } from "zustand";
import { DEFAULT_SERVER_URL } from "../constants";

type SettingsState = {
  serverUrl: string;
  locationEnabled: boolean;
  pushEnabled: boolean;
  setServerUrl: (url: string) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setPushEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  serverUrl: DEFAULT_SERVER_URL,
  locationEnabled: false,
  pushEnabled: false,
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setLocationEnabled: (locationEnabled) => set({ locationEnabled }),
  setPushEnabled: (pushEnabled) => set({ pushEnabled })
}));
