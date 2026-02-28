import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Zone {
  identifier: string;
  label: string;
  latitude: number;
  longitude: number;
  radius: number;
}

const ZONES_KEY = "clawire_zones";

export async function saveZone(zone: Zone): Promise<void> {
  const existing = await loadZones();
  const updated = existing.filter((item) => item.identifier !== zone.identifier);
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

export async function removeZone(identifier: string): Promise<void> {
  const existing = await loadZones();
  await AsyncStorage.setItem(
    ZONES_KEY,
    JSON.stringify(existing.filter((zone) => zone.identifier !== identifier))
  );
}

export async function hasZones(): Promise<boolean> {
  const zones = await loadZones();
  return zones.length > 0;
}
