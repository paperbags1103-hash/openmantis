import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEventsStore } from "../../store/events";

export default function AgentsScreen() {
  const events = useEventsStore((state) => state.events);

  const stats = useMemo(() => {
    const eventsToday = events.filter((event) => {
      const created = new Date(event.createdAt);
      const now = new Date();
      return created.toDateString() === now.toDateString();
    }).length;

    const activeRules = 6;
    const apiCostEstimate = (eventsToday * 0.0025).toFixed(2);

    return { eventsToday, activeRules, apiCostEstimate };
  }, [events]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agent Status</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Active rules count</Text>
        <Text style={styles.value}>{stats.activeRules}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Events today</Text>
        <Text style={styles.value}>{stats.eventsToday}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>API cost estimate</Text>
        <Text style={styles.value}>${stats.apiCostEstimate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  label: { color: "#6b7280", marginBottom: 4 },
  value: { fontSize: 24, fontWeight: "700" }
});
