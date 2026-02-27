import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { GeofenceZone, startGeofencing, stopGeofencing } from "../../services/location-watcher";
import { registerForPushNotifications } from "../../services/push-handler";
import { setServerUrl } from "../../services/server-api";
import { useSettingsStore } from "../../store/settings";

const zones: GeofenceZone[] = [
  { name: "company", latitude: 37.7858, longitude: -122.4064, radius: 250 },
  { name: "home", latitude: 37.7599, longitude: -122.4148, radius: 200 }
];

export default function SettingsScreen() {
  const { serverUrl, locationEnabled, pushEnabled, setLocationEnabled, setPushEnabled, setServerUrl: saveServerUrl } =
    useSettingsStore();
  const [serverInput, setServerInput] = useState(serverUrl);

  useEffect(() => {
    setServerUrl(serverUrl);
  }, [serverUrl]);

  const toggleLocation = async (value: boolean) => {
    setLocationEnabled(value);
    if (value) {
      try {
        await startGeofencing(zones);
      } catch (error) {
        console.warn("Unable to start geofencing", error);
        setLocationEnabled(false);
      }
    } else {
      await stopGeofencing();
    }
  };

  const togglePush = async (value: boolean) => {
    setPushEnabled(value);
    if (value) {
      try {
        await registerForPushNotifications();
      } catch (error) {
        console.warn("Unable to register push", error);
        setPushEnabled(false);
      }
    }
  };

  const geofenceRows = useMemo(
    () =>
      zones.map((zone) => (
        <View key={zone.name} style={styles.zoneRow}>
          <Text style={styles.zoneName}>{zone.name}</Text>
          <Text style={styles.zoneCoords}>
            {zone.latitude}, {zone.longitude}
          </Text>
        </View>
      )),
    []
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Location Sensor</Text>
        <Switch value={locationEnabled} onValueChange={toggleLocation} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Push Notifications</Text>
        <Switch value={pushEnabled} onValueChange={togglePush} />
      </View>

      <Text style={styles.label}>Server URL</Text>
      <TextInput
        value={serverInput}
        onChangeText={setServerInput}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Pressable
        onPress={() => {
          const cleaned = serverInput.trim();
          saveServerUrl(cleaned);
          setServerUrl(cleaned);
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Save URL</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Geofences</Text>
      {geofenceRows}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20
  },
  buttonText: { color: "#ffffff", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  zoneRow: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  zoneName: { fontWeight: "700", textTransform: "capitalize", marginBottom: 2 },
  zoneCoords: { color: "#4b5563" }
});
