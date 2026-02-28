import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { checkServerConnection } from "../services/connection";

type ConnectionBannerProps = {
  serverUrl: string;
};

export function ConnectionBanner({ serverUrl }: ConnectionBannerProps) {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let active = true;

    const pollConnection = async () => {
      const reachable = await checkServerConnection(serverUrl);
      if (active) {
        setConnected(reachable);
      }
    };

    void pollConnection();
    const timer = setInterval(() => {
      void pollConnection();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [serverUrl]);

  if (connected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ ClaWire 서버 연결 끊김</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
