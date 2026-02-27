import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEventsStore } from "../store/events";

let registered = false;

export const setupPushNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });
};

export const registerForPushNotifications = async () => {
  if (registered) {
    return;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Push notification permission denied");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  await Notifications.getExpoPushTokenAsync();
  registered = true;
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
      data: payload as Record<string, unknown>
    });
  });

  return () => subscription.remove();
};
