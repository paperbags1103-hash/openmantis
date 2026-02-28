import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { reloadZones } from "../services/location-watcher";
import { createZoneId, deleteZone, loadZones, saveZone, type Zone } from "../services/zones";

const EMOJI_OPTIONS = [
  "📍",
  "🏠",
  "🏢",
  "🏋️",
  "☕",
  "🏥",
  "📚",
  "🍽️",
  "🛒",
  "🎮",
  "🏫",
  "🌳",
  "✈️",
  "🏖️",
  "⛪",
];
const RADIUS_OPTIONS = [50, 100, 200, 500];

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function formatAddress(address: Location.LocationGeocodedAddress | null): string {
  if (!address) {
    return "";
  }

  return [address.region, address.city, address.district, address.street, address.name]
    .filter(Boolean)
    .join(" ");
}

export default function ZoneEditScreen() {
  const params = useLocalSearchParams<{ zoneId?: string }>();
  const zoneId = useMemo(
    () => (typeof params.zoneId === "string" ? params.zoneId : undefined),
    [params.zoneId]
  );
  const [existingZone, setExistingZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emoji, setEmoji] = useState("📍");
  const [label, setLabel] = useState("");
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [radius, setRadius] = useState(200);
  const [address, setAddress] = useState("");

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (!zoneId) {
        if (active) {
          setExistingZone(null);
          setLoading(false);
        }
        return;
      }

      const zones = await loadZones();
      const zone = zones.find((item) => item.id === zoneId) ?? null;
      if (!active) {
        return;
      }

      setExistingZone(zone);
      if (zone) {
        setEmoji(zone.emoji);
        setLabel(zone.label);
        setLatitude(zone.latitude);
        setLongitude(zone.longitude);
        setRadius(zone.radius);
      }
      setLoading(false);
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [zoneId]);

  useEffect(() => {
    let active = true;

    const resolveAddress = async () => {
      if (latitude === 0 && longitude === 0) {
        setAddress("");
        return;
      }

      try {
        const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (active) {
          setAddress(formatAddress(result ?? null));
        }
      } catch {
        if (active) {
          setAddress("");
        }
      }
    };

    void resolveAddress();

    return () => {
      active = false;
    };
  }, [latitude, longitude]);

  const onUseCurrentLocation = async () => {
    setBusy(true);

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch (error) {
      Alert.alert("위치 확인 실패", error instanceof Error ? error.message : "현재 위치를 가져오지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    const trimmedLabel = label.trim();

    if (!trimmedLabel) {
      Alert.alert("이름 필요", "장소 이름을 입력하세요.");
      return;
    }

    if (latitude === 0 && longitude === 0) {
      Alert.alert("위치 필요", "현재 위치를 설정하세요.");
      return;
    }

    setBusy(true);

    try {
      await saveZone({
        id: existingZone?.id ?? createZoneId(),
        label: trimmedLabel,
        emoji,
        latitude,
        longitude,
        radius,
        createdAt: existingZone?.createdAt ?? Date.now(),
      });
      await reloadZones();
      router.replace("/(tabs)/settings");
    } catch (error) {
      Alert.alert("저장 실패", error instanceof Error ? error.message : "장소 저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!existingZone) {
      return;
    }

    Alert.alert("장소 삭제", `"${existingZone.label}" 장소를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await deleteZone(existingZone.id);
              await reloadZones();
              router.replace("/(tabs)/settings");
            } catch (error) {
              Alert.alert("삭제 실패", error instanceof Error ? error.message : "장소를 삭제하지 못했습니다.");
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.loadingScreen} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backButton}>뒤로</Text>
        </Pressable>
        <Text style={styles.title}>{existingZone ? "장소 수정" : "장소 추가"}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>이모지</Text>
        <Text style={styles.selectedEmoji}>{emoji}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {EMOJI_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.emojiChip, emoji === option ? styles.emojiChipActive : null]}
              onPress={() => setEmoji(option)}
            >
              <Text style={styles.emojiChipText}>{option}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>장소 이름</Text>
        <TextInput
          value={label}
          onChangeText={(value) => setLabel(value.slice(0, 20))}
          placeholder="장소 이름 (예: 헬스장, 카페...)"
          maxLength={20}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>위치</Text>
        <Pressable style={styles.locationButton} onPress={() => void onUseCurrentLocation()} disabled={busy}>
          <Text style={styles.locationButtonText}>📍 현재 위치 사용</Text>
        </Pressable>
        <Text style={styles.locationText}>
          {latitude === 0 && longitude === 0
            ? "위치를 아직 설정하지 않았습니다."
            : formatCoordinates(latitude, longitude)}
        </Text>
        {address ? <Text style={styles.addressText}>{address}</Text> : null}

        <Text style={styles.sectionTitle}>감지 반경</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.radiusButton, radius === option ? styles.radiusButtonActive : null]}
              onPress={() => setRadius(option)}
            >
              <Text style={[styles.radiusButtonText, radius === option ? styles.radiusButtonTextActive : null]}>
                {option}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={() => void onSave()} disabled={busy}>
        <Text style={styles.saveButtonText}>저장</Text>
      </Pressable>

      {existingZone ? (
        <Pressable style={styles.deleteWrap} onPress={() => void onDelete()} disabled={busy}>
          <Text style={styles.deleteText}>이 장소 삭제</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
  },
  selectedEmoji: {
    fontSize: 52,
    textAlign: "center",
  },
  emojiRow: {
    gap: 10,
    paddingVertical: 2,
  },
  emojiChip: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiChipActive: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#60a5fa",
  },
  emojiChipText: {
    fontSize: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#f9fafb",
    fontSize: 16,
  },
  locationButton: {
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    paddingVertical: 13,
  },
  locationButtonText: {
    color: "#075985",
    fontWeight: "800",
    fontSize: 15,
  },
  locationText: {
    fontSize: 15,
    color: "#111827",
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  radiusButton: {
    minWidth: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  radiusButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  radiusButtonText: {
    color: "#374151",
    fontWeight: "700",
  },
  radiusButtonTextActive: {
    color: "#ffffff",
  },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  deleteText: {
    color: "#b91c1c",
    fontSize: 15,
    fontWeight: "700",
  },
});
