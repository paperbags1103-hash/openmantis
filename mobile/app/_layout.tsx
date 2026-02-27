import { Stack } from "expo-router";
import { useEffect } from "react";
import { attachPushListener, setupPushNotificationHandler, registerForPushNotifications } from "../services/push-handler";
import { startAllWatchers, stopAllWatchers } from "../services";

export default function RootLayout() {
  useEffect(() => {
    setupPushNotificationHandler();
    registerForPushNotifications().then(token => {
      if (token) console.log("[app] Push token ready:", token);
    });
    const detach = attachPushListener();
    startAllWatchers().catch((error) => {
      console.warn("[ClaWire] Failed to start watchers:", error);
    });

    return () => {
      stopAllWatchers();
      detach();
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
