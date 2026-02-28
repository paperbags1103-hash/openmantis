import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ConnectionBanner } from "../../components/ConnectionBanner";
import { AgentEvent, getRecentEvents } from "../../services/server-api";
import { useSettingsStore } from "../../store/settings";

const getSeverityIcon = (severity?: string) => {
  if (severity === "critical" || severity === "high") return "🔴";
  if (severity === "medium") return "🟡";
  return "🟢";
};

const formatKoreanTimeAgo = (isoDate: string) => {
  const eventTime = new Date(isoDate).getTime();
  if (Number.isNaN(eventTime)) return "시간 정보 없음";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - eventTime) / 1000));

  if (diffSeconds < 60) return "방금 전";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`;
  return `${Math.floor(diffSeconds / 86400)}일 전`;
};

export default function FeedScreen() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const setConnectionStatus = useSettingsStore((state) => state.setConnectionStatus);

  const fetchRecent = useCallback(async () => {
    try {
      const remoteEvents = await getRecentEvents();
      setEvents(remoteEvents);
      setError(null);
      setConnectionStatus("connected");
    } catch (fetchError) {
      console.warn("Failed to fetch recent events", fetchError);
      setError("서버에 연결할 수 없습니다");
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  }, [setConnectionStatus]);

  useEffect(() => {
    void fetchRecent();
    const timer = setInterval(() => {
      void fetchRecent();
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchRecent]);

  const feedData = useMemo(() => events, [events]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>서버에 연결할 수 없습니다</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            void fetchRecent();
          }}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ConnectionBanner serverUrl={serverUrl} />
      <Text style={styles.title}>이벤트 피드</Text>
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>표시할 이벤트가 없습니다.</Text>}
        renderItem={({ item }) => {
          const eventTime = item.timestamp ?? (item as AgentEvent & { createdAt?: string }).createdAt ?? "";
          return (
            <View style={styles.row}>
              <Text style={styles.icon}>{getSeverityIcon(item.severity)}</Text>
              <View style={styles.meta}>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.subMeta}>
                  {formatKoreanTimeAgo(eventTime)} · {item.source}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  icon: { fontSize: 20, marginRight: 10 },
  meta: { flex: 1 },
  type: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  subMeta: { color: "#6b7280" },
  empty: { color: "#6b7280", marginTop: 20 },
  errorText: { fontSize: 16, color: "#111827", marginBottom: 12 },
  retryButton: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  retryButtonText: { color: "#ffffff", fontWeight: "700" }
});
