import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEventsStore } from "../store/events";

let registered = false;

export const setupPushNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (registered) return null;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    console.warn("[push] Permission denied");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log("[push] Expo Push Token:", token);
    registered = true;
    return token;
  } catch (e) {
    console.warn("[push] Token fetch failed (Expo Go 제한):", e);
    // Expo Go에서는 실패할 수 있음 — 로컬 알림으로 폴백
    return null;
  }
};

// 로컬 알림 (서버 이벤트 → 폰 알림, Expo Go에서도 동작)
export const showLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // 즉시 발송
  });
};

export const attachPushListener = () => {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const payload = notification.request.content.data;

    useEventsStore.getState().addEvent({
      id: String(payload.id ?? `push-${Date.now()}`),
      type: String(payload.type ?? "push_notification"),
      severity:
        payload.severity === "high" || payload.severity === "medium" || payload.severity === "low"
          ? payload.severity
          : "medium",
      createdAt: new Date().toISOString(),
      data: payload as Record<string, unknown>,
    });
  });

  return () => subscription.remove();
};
