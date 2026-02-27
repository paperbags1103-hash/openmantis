import Constants from "expo-constants";

// 개발 중: Expo Metro 서버 IP에서 자동으로 Mac IP 추출
// 프로덕션: 실제 서버 URL로 교체
function getDefaultServerUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:3002`;
    }
  }
  return "http://localhost:3002";
}

export const DEFAULT_SERVER_URL = getDefaultServerUrl();

export const EVENT_SEVERITY = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
  critical: "#dc2626",
} as const;
