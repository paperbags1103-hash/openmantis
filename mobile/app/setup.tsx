import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Calendar from "expo-calendar";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSettingsStore } from "../store/settings";

interface SetupPayload {
  url: string;
  token: string;
}

type SetupStep = 1 | 2 | 3;

function isSetupPayload(value: unknown): value is SetupPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as SetupPayload).url === "string" &&
      typeof (value as SetupPayload).token === "string"
  );
}

function normalizeServerUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");
  const parsed = new URL(normalized);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("http:// 또는 https:// URL을 입력하세요");
  }

  return parsed.toString().replace(/\/+$/, "");
}

async function getExpoPushToken(): Promise<string> {
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "69a35948-4619-4898-8b6c-9408d84f0470",
  });

  return tokenData.data;
}

async function pairDevice(baseUrl: string, setupToken?: string): Promise<void> {
  let expoPushToken = "";

  try {
    expoPushToken = await getExpoPushToken();
  } catch (error) {
    console.warn("[ClaWire] Expo push token unavailable during setup:", error);
  }

  const response = await fetch(`${baseUrl}/setup/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expo_push_token: expoPushToken,
      setup_token: setupToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pairing failed: ${response.status}`);
  }
}

async function requestAllPermissions(): Promise<void> {
  await Notifications.requestPermissionsAsync();
  await Calendar.requestCalendarPermissionsAsync();
  await Location.requestForegroundPermissionsAsync();
  await Location.requestBackgroundPermissionsAsync();
}

export default function SetupScreen() {
  const [step, setStep] = useState<SetupStep>(1);
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupUrl, setSetupUrl] = useState("");
  const [setupToken, setSetupToken] = useState<string | undefined>(undefined);
  const [scanLocked, setScanLocked] = useState(false);
  const setServerUrl = useSettingsStore((state) => state.setServerUrl);

  const proceedToPermissions = useCallback(
    async (url: string, token?: string) => {
      const normalizedUrl = normalizeServerUrl(url);
      await AsyncStorage.setItem("clawire_server_url", normalizedUrl);
      setServerUrl(normalizedUrl);
      setSetupUrl(normalizedUrl);
      setSetupToken(token);
      setStep(3);
    },
    [setServerUrl]
  );

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (busy || scanLocked) {
        return;
      }

      setBusy(true);
      setScanLocked(true);

      try {
        const parsed = JSON.parse(data) as unknown;
        if (!isSetupPayload(parsed)) {
          throw new Error("QR 코드 형식이 올바르지 않습니다");
        }

        await proceedToPermissions(parsed.url, parsed.token);
      } catch (error) {
        setScanLocked(false);
        Alert.alert("설정 실패", error instanceof Error ? error.message : "QR 코드를 확인할 수 없습니다");
      } finally {
        setBusy(false);
      }
    },
    [busy, proceedToPermissions, scanLocked]
  );

  const onManualSubmit = useCallback(async () => {
    if (!manualUrl.trim()) {
      Alert.alert("서버 주소 필요", "서버 URL을 입력하세요");
      return;
    }

    setBusy(true);
    try {
      await proceedToPermissions(manualUrl);
    } catch (error) {
      Alert.alert("설정 실패", error instanceof Error ? error.message : "서버 URL을 확인하세요");
    } finally {
      setBusy(false);
    }
  }, [manualUrl, proceedToPermissions]);

  const onRequestPermissions = useCallback(async () => {
    if (!setupUrl) {
      return;
    }

    setBusy(true);

    try {
      await requestAllPermissions();
      await pairDevice(setupUrl, setupToken);
      await AsyncStorage.setItem("clawire_server_url", setupUrl);
      setServerUrl(setupUrl);
      router.replace("/(tabs)/feed");
    } catch (error) {
      Alert.alert("설정 실패", error instanceof Error ? error.message : "권한 또는 페어링에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }, [setServerUrl, setupToken, setupUrl]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.brand}>ClaWire</Text>
          <Text style={styles.subtitle}>OpenClaw 스마트폰 신호 레이어</Text>
          <Text style={styles.description}>iPhone 신호를 AI 어시스턴트에게 연결합니다</Text>

          <Pressable style={styles.primaryButton} onPress={() => setStep(2)}>
            <Text style={styles.primaryButtonText}>시작하기</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>서버 연결</Text>
          <Text style={styles.stepDescription}>QR 코드를 스캔하거나 서버 URL을 직접 입력하세요.</Text>

          {!manualMode ? (
            <>
              {!permission?.granted ? (
                <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
                  <Text style={styles.primaryButtonText}>카메라 권한 허용</Text>
                </Pressable>
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={onBarcodeScanned}
                />
              )}
            </>
          ) : null}

          <Pressable style={styles.linkButton} onPress={() => setManualMode((value) => !value)}>
            <Text style={styles.linkButtonText}>URL 직접 입력</Text>
          </Pressable>

          {manualMode ? (
            <>
              <TextInput
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.x.x:3002"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={() => void onManualSubmit()} disabled={busy}>
                <Text style={styles.primaryButtonText}>URL 저장</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={styles.skipButton} onPress={() => setManualMode(true)}>
            <Text style={styles.skipButtonText}>건너뛰기</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>권한 설정</Text>
          <Text style={styles.stepDescription}>아래 권한을 요청한 뒤 서버와 페어링을 완료합니다.</Text>

          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>알림 권한</Text>
            <Text style={styles.permissionText}>치레가 상황에 맞는 푸시 알림을 보낼 때 사용됩니다.</Text>
          </View>

          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>캘린더 권한</Text>
            <Text style={styles.permissionText}>다가오는 일정 신호를 감지하는 데 사용됩니다.</Text>
          </View>

          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>위치 권한</Text>
            <Text style={styles.permissionText}>
              위치 권한은 집/회사 도착·출발 감지에 사용됩니다.{"\n"}데이터는 내 서버에만 전송됩니다.
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => void onRequestPermissions()} disabled={busy}>
            <Text style={styles.primaryButtonText}>권한 요청 및 완료</Text>
          </Pressable>
        </View>
      ) : null}

      {busy ? <ActivityIndicator style={styles.spinner} size="large" color="#111827" /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  brand: {
    color: "#111827",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#1f2937",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  description: {
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  stepTitle: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 10,
  },
  stepDescription: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  camera: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
  },
  input: {
    borderColor: "#d1d5db",
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 4,
  },
  linkButtonText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "600",
  },
  skipButton: {
    alignSelf: "center",
    marginTop: 16,
  },
  skipButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
  permissionCard: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  permissionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  permissionText: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 21,
  },
  spinner: {
    marginTop: 20,
  },
});
