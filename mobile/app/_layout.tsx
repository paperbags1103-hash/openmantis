import { Stack } from "expo-router";
import { useEffect } from "react";
import { attachPushListener, setupPushNotificationHandler } from "../services/push-handler";

export default function RootLayout() {
  useEffect(() => {
    setupPushNotificationHandler();
    const detach = attachPushListener();
    return detach;
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
