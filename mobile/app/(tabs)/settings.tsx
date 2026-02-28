import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DEFAULT_ZONES, startGeofencing, stopGeofencing } from "../../services/location-watcher";
import { getHealth } from "../../services/server-api";
import useSettingsStore from "../../store/settings";

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

  const onSaveServerUrl = async () => {
    const cleaned = serverInput.trim();
    await AsyncStorage.setItem("clawire_server_url", cleaned);
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

  const onToggleLocation = async (enabled: boolean) => {
    try {
      if (enabled) {
        await startGeofencing(DEFAULT_ZONES);
      } else {
        await stopGeofencing();
      }
      setLocationEnabled(enabled);
    } catch (error) {
      console.warn("Location toggle failed", error);
      if (enabled) {
        Alert.alert("위치 권한 필요", "위치 권한이 거부되어 지오펜싱 감지를 시작할 수 없습니다.");
      } else {
        Alert.alert("오류", "지오펜싱 감지를 중지하지 못했습니다. 다시 시도해 주세요.");
      }
      setLocationEnabled(false);
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

      <Pressable onPress={() => void onSaveServerUrl()} style={styles.button}>
        <Text style={styles.buttonText}>저장</Text>
      </Pressable>

      <Pressable onPress={onTestConnection} style={styles.buttonSecondary}>
        <Text style={styles.buttonSecondaryText}>연결 테스트</Text>
      </Pressable>

      {!!testResult && <Text style={styles.result}>{testResult}</Text>}

      <Text style={styles.connectionInfo}>현재 상태: {connectionStatus}</Text>

      <Text style={styles.label}>위치 센서</Text>
      <View style={styles.toggleWrap}>
        <Pressable
          onPress={() => onToggleLocation(true)}
          style={[styles.toggleOption, locationEnabled && styles.toggleOptionActive]}
        >
          <Text style={[styles.toggleText, locationEnabled && styles.toggleTextActive]}>ON</Text>
        </Pressable>
        <Pressable
          onPress={() => onToggleLocation(false)}
          style={[styles.toggleOption, !locationEnabled && styles.toggleOptionActive]}
        >
          <Text style={[styles.toggleText, !locationEnabled && styles.toggleTextActive]}>OFF</Text>
        </Pressable>
      </View>
      <Text style={styles.locationHint}>ON 시 지오펜싱으로 집/회사 진입 및 이탈을 감지합니다.</Text>
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
  toggleTextActive: { color: "#ffffff" },
  locationHint: { marginTop: 8, fontSize: 12, color: "#6b7280" }
});
