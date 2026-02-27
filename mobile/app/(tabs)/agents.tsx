import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getHealth } from "../../services/server-api";
import { useSettingsStore } from "../../store/settings";

const statusLabel: Record<"unknown" | "connected" | "error", string> = {
  unknown: "확인 전",
  connected: "연결됨",
  error: "연결 오류"
};

export default function AgentsScreen() {
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const connectionStatus = useSettingsStore((state) => state.connectionStatus);
  const setConnectionStatus = useSettingsStore((state) => state.setConnectionStatus);

  useEffect(() => {
    const checkServer = async () => {
      try {
        await getHealth();
        setConnectionStatus("connected");
      } catch (error) {
        console.warn("Health check failed", error);
        setConnectionStatus("error");
      }
    };

    void checkServer();
  }, [setConnectionStatus]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>에이전트 상태</Text>

      <View style={styles.card}>
        <Text style={styles.label}>연결 상태</Text>
        <Text style={styles.value}>{statusLabel[connectionStatus]}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>서버 URL</Text>
        <Text style={styles.url}>{serverUrl}</Text>
      </View>

      <Text style={styles.sectionTitle}>요약 통계</Text>

      <View style={styles.card}>
        <Text style={styles.label}>활성 규칙 수</Text>
        <Text style={styles.value}>0</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>오늘 이벤트 수</Text>
        <Text style={styles.value}>0</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>API 비용 추정</Text>
        <Text style={styles.value}>$0.00</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginVertical: 8 },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  label: { color: "#6b7280", marginBottom: 4 },
  value: { fontSize: 24, fontWeight: "700" },
  url: { fontSize: 14, fontWeight: "600", color: "#111827" }
});
