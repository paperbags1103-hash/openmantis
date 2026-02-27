import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getHealth } from "../../services/server-api";
import { useSettingsStore } from "../../store/settings";

export default function SettingsScreen() {
  const {
    serverUrl,
    locationEnabled,
    connectionStatus,
    setServerUrl,
    setLocationEnabled,
    setConnectionStatus
  } = useSettingsStore();

  const [serverInput, setServerInput] = useState(serverUrl);
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    setServerInput(serverUrl);
  }, [serverUrl]);

  const onSaveServerUrl = () => {
    const cleaned = serverInput.trim();
    setServerUrl(cleaned);
    setConnectionStatus("unknown");
    setTestResult("");
  };

  const onTestConnection = async () => {
    try {
      await getHealth();
      setConnectionStatus("connected");
      setTestResult("✅ 연결됨");
    } catch (error) {
      console.warn("Connection test failed", error);
      setConnectionStatus("error");
      setTestResult("❌ 연결 실패");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>

      <Text style={styles.label}>서버 URL</Text>
      <TextInput
        value={serverInput}
        onChangeText={setServerInput}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <Pressable onPress={onSaveServerUrl} style={styles.button}>
        <Text style={styles.buttonText}>저장</Text>
      </Pressable>

      <Pressable onPress={onTestConnection} style={styles.buttonSecondary}>
        <Text style={styles.buttonSecondaryText}>연결 테스트</Text>
      </Pressable>

      {!!testResult && <Text style={styles.result}>{testResult}</Text>}

      <Text style={styles.connectionInfo}>현재 상태: {connectionStatus}</Text>

      <Text style={styles.label}>위치 센서 (UI 전용)</Text>
      <View style={styles.toggleWrap}>
        <Pressable
          onPress={() => setLocationEnabled(true)}
          style={[styles.toggleOption, locationEnabled && styles.toggleOptionActive]}
        >
          <Text style={[styles.toggleText, locationEnabled && styles.toggleTextActive]}>ON</Text>
        </Pressable>
        <Pressable
          onPress={() => setLocationEnabled(false)}
          style={[styles.toggleOption, !locationEnabled && styles.toggleOptionActive]}
        >
          <Text style={[styles.toggleText, !locationEnabled && styles.toggleTextActive]}>OFF</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ffffff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 8 },
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
    marginBottom: 10
  },
  buttonText: { color: "#ffffff", fontWeight: "700" },
  buttonSecondary: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonSecondaryText: { color: "#111827", fontWeight: "700" },
  result: { marginTop: 10, fontSize: 16, fontWeight: "700" },
  connectionInfo: { marginTop: 8, color: "#4b5563" },
  toggleWrap: {
    marginTop: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden"
  },
  toggleOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#ffffff"
  },
  toggleOptionActive: {
    backgroundColor: "#111827"
  },
  toggleText: { fontWeight: "700", color: "#111827" },
  toggleTextActive: { color: "#ffffff" }
});
