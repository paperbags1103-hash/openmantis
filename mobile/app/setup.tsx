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
import { reloadZones } from "../services/location-watcher";
import { saveZone, type Zone } from "../services/zones";
import { useSettingsStore } from "../store/settings";

interface SetupPayload {
  url: string;
  token: string;
}

type SetupStep = 1 | 2 | 3 | 4 | 5;

type SavedZoneState = {
  zone: Zone;
  description: string;
};

const SERVER_URL_KEY = "clawire_server_url";

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

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function formatAddress(
  address: Location.LocationGeocodedAddress | null,
  latitude: number,
  longitude: number
): string {
  if (!address) {
    return formatCoordinates(latitude, longitude);
  }

  const parts = [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : formatCoordinates(latitude, longitude);
}

async function resolveAddress(latitude: number, longitude: number): Promise<string> {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return formatAddress(address ?? null, latitude, longitude);
  } catch {
    return formatCoordinates(latitude, longitude);
  }
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

function ZoneCard({
  emoji,
  title,
  buttonLabel,
  savedZone,
  onSave,
  busy,
}: {
  emoji: string;
  title: string;
  buttonLabel: string;
  savedZone?: SavedZoneState;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.zoneCard}>
      <Text style={styles.zoneEmoji}>{emoji}</Text>
      <Text style={styles.zoneTitle}>{title}</Text>
      <Pressable style={styles.secondaryButton} onPress={onSave} disabled={busy}>
        <Text style={styles.secondaryButtonText}>{buttonLabel}</Text>
      </Pressable>
      {savedZone ? (
        <View style={styles.zoneSavedWrap}>
          <Text style={styles.zoneSavedTitle}>✅ 저장 완료</Text>
          <Text style={styles.zoneSavedText}>{savedZone.description}</Text>
        </View>
      ) : (
        <Text style={styles.zoneHint}>현재 위치를 기준으로 존을 저장합니다.</Text>
      )}
    </View>
  );
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
  const [savedHome, setSavedHome] = useState<SavedZoneState | undefined>(undefined);
  const [savedCompany, setSavedCompany] = useState<SavedZoneState | undefined>(undefined);
  const setServerUrl = useSettingsStore((state) => state.setServerUrl);
  const savedZoneCount = (savedHome ? 1 : 0) + (savedCompany ? 1 : 0);

  const proceedToPermissions = useCallback(
    async (url: string, token?: string) => {
      const normalizedUrl = normalizeServerUrl(url);
      await AsyncStorage.setItem(SERVER_URL_KEY, normalizedUrl);
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
      await AsyncStorage.setItem(SERVER_URL_KEY, setupUrl);
      setServerUrl(setupUrl);
      setStep(4);
    } catch (error) {
      Alert.alert("설정 실패", error instanceof Error ? error.message : "권한 또는 페어링에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }, [setServerUrl, setupToken, setupUrl]);

  const saveCurrentZone = useCallback(
    async (identifier: "home" | "company", label: "집" | "회사") => {
      setBusy(true);

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const zone: Zone = {
          identifier,
          label,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius: 200,
        };
        const description = await resolveAddress(zone.latitude, zone.longitude);
        await saveZone(zone);

        const saved = { zone, description };
        if (identifier === "home") {
          setSavedHome(saved);
        } else {
          setSavedCompany(saved);
        }
      } catch (error) {
        Alert.alert("위치 저장 실패", error instanceof Error ? error.message : "현재 위치를 가져오지 못했습니다");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const finishSetup = useCallback(async () => {
    setBusy(true);

    try {
      await reloadZones();
    } catch (error) {
      console.warn("[ClaWire] Failed to reload zones after setup:", error);
    } finally {
      setBusy(false);
      router.replace("/(tabs)/feed");
    }
  }, []);

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
            <Text style={styles.primaryButtonText}>권한 요청 및 계속</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>내 위치 등록</Text>
          <Text style={styles.stepDescription}>집과 회사를 등록하면 AI가 도착·출발을 감지합니다</Text>

          <View style={styles.zoneCardGrid}>
            <ZoneCard
              emoji="🏠"
              title="집"
              buttonLabel="지금 여기가 집이에요"
              savedZone={savedHome}
              onSave={() => void saveCurrentZone("home", "집")}
              busy={busy}
            />
            <ZoneCard
              emoji="🏢"
              title="회사"
              buttonLabel="지금 여기가 회사예요"
              savedZone={savedCompany}
              onSave={() => void saveCurrentZone("company", "회사")}
              busy={busy}
            />
          </View>

          <Pressable style={styles.skipButton} onPress={() => setStep(5)} disabled={busy}>
            <Text style={styles.skipButtonText}>나중에 설정</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={() => setStep(5)} disabled={busy}>
            <Text style={styles.primaryButtonText}>다음</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>설정 완료!</Text>
          <Text style={styles.stepDescription}>
            서버 연결과 권한 설정이 끝났습니다. 저장된 위치 존은 {savedZoneCount}개입니다.
          </Text>
          <Text style={styles.completionText}>설정에서 언제든 집/회사 위치와 추가 존을 다시 관리할 수 있습니다.</Text>

          <Pressable style={styles.primaryButton} onPress={() => void finishSetup()} disabled={busy}>
            <Text style={styles.primaryButtonText}>시작하기</Text>
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
    elevation: 4,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    marginBottom: 20,
  },
  camera: {
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#e0f2fe",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#075985",
    fontWeight: "800",
  },
  linkButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  linkButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#6b7280",
    fontWeight: "700",
  },
  permissionCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  zoneCardGrid: {
    gap: 12,
  },
  zoneCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 18,
    padding: 18,
  },
  zoneEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  zoneHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: "#6b7280",
  },
  zoneSavedWrap: {
    marginTop: 12,
    gap: 4,
  },
  zoneSavedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  zoneSavedText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  completionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4b5563",
    marginBottom: 8,
  },
  spinner: {
    marginTop: 20,
  },
});
