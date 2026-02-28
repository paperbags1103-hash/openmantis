import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { attachPushListener, setupPushNotificationHandler, registerForPushNotifications } from "../services/push-handler";
import { startAllWatchers, stopAllWatchers } from "../services";
import { useSettingsStore } from "../store/settings";

export default function RootLayout() {
  const pathname = usePathname();
  const setServerUrl = useSettingsStore((state) => state.setServerUrl);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const storedUrl = await AsyncStorage.getItem("clawire_server_url");
      if (!active) return;

      if (!storedUrl) {
        setReady(true);
        if (pathname !== "/setup") {
          router.replace("/setup");
        }
        return;
      }

      setServerUrl(storedUrl);
      setupPushNotificationHandler();
      registerForPushNotifications().then(token => {
        if (token) console.log("[app] Push token ready:", token);
      });
      const detach = attachPushListener();
      startAllWatchers().catch((error) => {
        console.warn("[ClaWire] Failed to start watchers:", error);
      });

      setReady(true);

      return () => {
        stopAllWatchers();
        detach();
      };
    };

    let cleanup: (() => void) | undefined;
    void boot().then((value) => {
      cleanup = value;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    void AsyncStorage.getItem("clawire_server_url").then((storedUrl) => {
      if (!storedUrl && pathname !== "/setup") {
        router.replace("/setup");
      }
    });
  }, [pathname, ready]);

  if (!ready) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
