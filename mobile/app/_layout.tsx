import { Stack } from "expo-router";
import { useEffect } from "react";
import { attachPushListener, setupPushNotificationHandler, registerForPushNotifications } from "../services/push-handler";

export default function RootLayout() {
  useEffect(() => {
    setupPushNotificationHandler();
    registerForPushNotifications().then(token => {
      if (token) console.log("[app] Push token ready:", token);
    });
    const detach = attachPushListener();
    return detach;
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
