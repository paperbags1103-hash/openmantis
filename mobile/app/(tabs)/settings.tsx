import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { loadZones, type Zone } from "../../services/zones";
import useSettingsStore from "../../store/settings";

const SERVER_URL_KEY = "clawire_server_url";
const GITHUB_URL = "https://github.com/paperbags1103-hash/openmantis";
const PRIVACY_URL = "https://paperbags1103-hash.github.io/openmantis/privacy.html";

export default function SettingsScreen() {
  const serverUrl = useSettingsStore((state) => state.serverUrl);
  const [zones, setZones] = useState<Zone[]>([]);
  const [storedServerUrl, setStoredServerUrl] = useState(serverUrl);

  const refresh = useCallback(async () => {
    const [savedZones, savedUrl] = await Promise.all([
      loadZones(),
      AsyncStorage.getItem(SERVER_URL_KEY),
    ]);
    setZones(savedZones.sort((a, b) => b.createdAt - a.createdAt));
    setStoredServerUrl(savedUrl ?? "");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const openLink = useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 장소</Text>
          <Pressable style={styles.addButton} onPress={() => router.push("/zone-edit")}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {zones.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>등록된 장소가 없습니다{"\n"}+ 버튼으로 추가하세요</Text>
            <Pressable style={styles.emptyAddButton} onPress={() => router.push("/zone-edit")}>
              <Text style={styles.emptyAddButtonText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.zoneList}>
            {zones.map((zone) => (
              <Pressable
                key={zone.id}
                style={styles.zoneRow}
                onPress={() => router.push({ pathname: "/zone-edit", params: { zoneId: zone.id } })}
              >
                <Text style={styles.zoneRowText}>
                  {zone.emoji} {zone.label} {zone.radius}m
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.bottomAddButton} onPress={() => router.push("/zone-edit")}>
              <Text style={styles.bottomAddButtonText}>장소 추가</Text>
            </Pressable>
          </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 18,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    lineHeight: 22,
  },
  emptyAddButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAddButtonText: {
    color: "#ffffff",
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "500",
  },
  zoneList: {
    gap: 10,
  },
  zoneRow: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 14,
  },
  zoneRowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  bottomAddButton: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    paddingVertical: 13,
  },
  bottomAddButtonText: {
    color: "#111827",
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
});
