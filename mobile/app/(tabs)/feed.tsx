import { useEffect, useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { EVENT_SEVERITY } from "../../constants";
import { getRecentEvents } from "../../services/server-api";
import { EventItem, useEventsStore } from "../../store/events";

const severityEmoji: Record<EventItem["severity"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢"
};

const formatTimeAgo = (isoDate: string) => {
  const deltaSeconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  return `${Math.floor(deltaSeconds / 86400)}d ago`;
};

export default function FeedScreen() {
  const events = useEventsStore((state) => state.events);
  const setEvents = useEventsStore((state) => state.setEvents);

  useEffect(() => {
    let isMounted = true;

    const fetchRecent = async () => {
      try {
        const remoteEvents = await getRecentEvents();
        if (isMounted) {
          setEvents(remoteEvents);
        }
      } catch (error) {
        console.warn("Failed to fetch recent events", error);
      }
    };

    fetchRecent();
    const timer = setInterval(fetchRecent, 30000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [setEvents]);

  const feedData = useMemo(() => events, [events]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Events</Text>
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No events yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.icon}>{severityEmoji[item.severity]}</Text>
            <View style={styles.meta}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            <View style={[styles.dot, { backgroundColor: EVENT_SEVERITY[item.severity] }]} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  icon: { fontSize: 20, marginRight: 10 },
  meta: { flex: 1 },
  type: { fontSize: 16, fontWeight: "600" },
  time: { color: "#6b7280", marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: "#6b7280", marginTop: 20 }
});
