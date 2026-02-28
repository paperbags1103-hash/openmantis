import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Zone {
  id: string;
  label: string;
  emoji: string;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: number;
}

const ZONES_KEY = "clawire_zones_v2";

export async function saveZone(zone: Zone): Promise<void> {
  const existing = await loadZones();
  const updated = existing.filter((item) => item.id !== zone.id);
  updated.push(zone);
  await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(updated));
}

export async function loadZones(): Promise<Zone[]> {
  const raw = await AsyncStorage.getItem(ZONES_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Zone[];
  } catch {
    return [];
  }
}

export async function deleteZone(id: string): Promise<void> {
  const existing = await loadZones();
  await AsyncStorage.setItem(
    ZONES_KEY,
    JSON.stringify(existing.filter((zone) => zone.id !== id))
  );
}

export function createZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
