import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { reloadZones } from "../../services/location-watcher";
import { loadZones, removeZone, saveZone, type Zone } from "../../services/zones";
import useSettingsStore from "../../store/settings";

const SERVER_URL_KEY = "clawire_server_url";
const GITHUB_URL = "https://github.com/paperbags1103-hash/openmantis";
const PRIVACY_URL = "https://paperbags1103-hash.github.io/openmantis/privacy.html";

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function getZoneIcon(identifier: string): string {
  if (identifier === "home") {
    return "🏠";
  }
  if (identifier === "company") {
    return "🏢";
  }
  return "📍";
}

function createIdentifier(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_가-힣]/g, "");

  return normalized || `zone-${Date.now()}`;
}

export default function SettingsScreen() {
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const [zones, setZones] = useState<Zone[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [busy, setBusy] = useState(false);
  const [storedServerUrl, setStoredServerUrl] = useState(serverUrl);

  const refresh = useCallback(async () => {
    const [savedZones, savedUrl] = await Promise.all([
      loadZones(),
      AsyncStorage.getItem(SERVER_URL_KEY),
    ]);
    setZones(savedZones);
    setStoredServerUrl(savedUrl ?? "");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const resetForm = useCallback(() => {
    setLabel("");
    setLatitude("");
    setLongitude("");
    setRadius("200");
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    resetForm();
  }, [resetForm]);

  const onUseCurrentLocation = useCallback(async () => {
    setBusy(true);

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
    } catch (error) {
      Alert.alert("위치 확인 실패", error instanceof Error ? error.message : "현재 위치를 가져오지 못했습니다");
    } finally {
      setBusy(false);
    }
  }, []);

  const onSaveZone = useCallback(async () => {
    const trimmedLabel = label.trim();
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedRadius = Number(radius);

    if (!trimmedLabel) {
      Alert.alert("이름 필요", "존 이름을 입력하세요.");
      return;
    }

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      Alert.alert("좌표 필요", "위도와 경도를 확인하세요.");
      return;
    }

    if (!Number.isFinite(parsedRadius) || parsedRadius < 100 || parsedRadius > 500) {
      Alert.alert("반경 오류", "반경은 100m에서 500m 사이여야 합니다.");
      return;
    }

    setBusy(true);

    try {
      await saveZone({
        identifier: createIdentifier(trimmedLabel),
        label: trimmedLabel,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        radius: parsedRadius,
      });
      await reloadZones();
      await refresh();
      closeModal();
    } catch (error) {
      Alert.alert("저장 실패", error instanceof Error ? error.message : "존 저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [closeModal, label, latitude, longitude, radius, refresh]);

  const onDeleteZone = useCallback(
    (zone: Zone) => {
      Alert.alert("존 삭제", `${zone.label} 존을 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await removeZone(zone.identifier);
                await reloadZones();
                await refresh();
              } catch (error) {
                Alert.alert("삭제 실패", error instanceof Error ? error.message : "존을 삭제하지 못했습니다.");
              }
            })();
          },
        },
      ]);
    },
    [refresh]
  );

  const openLink = useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 위치 존</Text>
          <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>추가</Text>
          </Pressable>
        </View>

        {zones.length === 0 ? (
          <Text style={styles.emptyText}>저장된 존이 없습니다. 집과 회사를 등록하면 도착·출발 감지가 활성화됩니다.</Text>
        ) : (
          zones.map((zone) => (
            <View key={zone.identifier} style={styles.zoneRow}>
              <View style={styles.zoneMeta}>
                <Text style={styles.zoneEmoji}>{getZoneIcon(zone.identifier)}</Text>
                <View style={styles.zoneTextWrap}>
                  <Text style={styles.zoneLabel}>{zone.label}</Text>
                  <Text style={styles.zoneDetail}>{formatCoordinates(zone.latitude, zone.longitude)}</Text>
                  <Text style={styles.zoneDetail}>반경 {zone.radius}m</Text>
                </View>
              </View>
              <Pressable style={styles.deleteButton} onPress={() => onDeleteZone(zone)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>서버 연결</Text>
        <Text style={styles.serverUrl}>{storedServerUrl || "연결된 서버 없음"}</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/setup")}>
          <Text style={styles.primaryButtonText}>다시 연결</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>
        <Text style={styles.infoRow}>앱 버전 {Constants.expoConfig?.version ?? "알 수 없음"}</Text>
        <Pressable style={styles.linkRow} onPress={() => void openLink(GITHUB_URL)}>
          <Text style={styles.linkText}>GitHub 열기</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => void openLink(PRIVACY_URL)}>
          <Text style={styles.linkText}>Privacy Policy 열기</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>새 위치 존 추가</Text>

            <Text style={styles.inputLabel}>이름</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="예: 헬스장"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>위도</Text>
            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              placeholder="37.5665"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>경도</Text>
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              placeholder="126.9780"
              style={styles.input}
            />

            <Pressable style={styles.secondaryButton} onPress={() => void onUseCurrentLocation()} disabled={busy}>
              <Text style={styles.secondaryButtonText}>현재 위치 사용</Text>
            </Pressable>

            <Text style={styles.inputLabel}>반경 (100m - 500m)</Text>
            <TextInput
              value={radius}
              onChangeText={setRadius}
              keyboardType="number-pad"
              placeholder="200"
              style={styles.input}
            />

            <Pressable style={styles.primaryButton} onPress={() => void onSaveZone()} disabled={busy}>
              <Text style={styles.primaryButtonText}>저장</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={closeModal} disabled={busy}>
              <Text style={styles.cancelButtonText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  addButton: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  emptyText: {
    color: "#6b7280",
    lineHeight: 20,
  },
  zoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  zoneMeta: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  zoneEmoji: {
    fontSize: 24,
  },
  zoneTextWrap: {
    flex: 1,
  },
  zoneLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  zoneDetail: {
    fontSize: 13,
    color: "#4b5563",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "800",
  },
  serverUrl: {
    fontSize: 14,
    color: "#374151",
    marginTop: 12,
    marginBottom: 12,
  },
  infoRow: {
    fontSize: 14,
    color: "#374151",
    marginTop: 12,
  },
  linkRow: {
    paddingVertical: 10,
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#075985",
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "700",
  },
});
