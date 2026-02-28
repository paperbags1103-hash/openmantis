import AsyncStorage from "@react-native-async-storage/async-storage";
import { postEvent } from "./server-api";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

type GeofenceZone = {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
};

const GEOFENCING_TASK = "clawire-geofencing-task";
const ZONES_STORAGE_KEY = "clawire_geofence_zones";

const HOME_ZONE: GeofenceZone = {
  latitude: 37.5665,
  longitude: 126.9780,
  radius: 200,
  identifier: "home"
};

const WORK_ZONE: GeofenceZone = {
  latitude: 37.5700,
  longitude: 126.9850,
  radius: 200,
  identifier: "company"
};

const DEFAULT_ZONES = [HOME_ZONE, WORK_ZONE];

const normalizeZones = (zones?: GeofenceZone[]) => {
  const source = zones && zones.length > 0 ? zones : DEFAULT_ZONES;
  return source.map((zone) => ({
    identifier: zone.identifier,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radius: zone.radius,
    notifyOnEnter: true,
    notifyOnExit: true
  }));
};

if (!TaskManager.isTaskDefined(GEOFENCING_TASK)) {
  TaskManager.defineTask<{
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  }>(GEOFENCING_TASK, async ({ data, error }) => {
    if (error || !data?.region) {
      if (error) {
        console.warn("Geofencing task failed", error);
      }
      return;
    }

    const eventType =
      data.eventType === Location.GeofencingEventType.Enter ? "geofence_enter" : "geofence_exit";

    await postEvent({
      type: eventType,
      source: "mobile/geofence",
      severity: data.eventType === Location.GeofencingEventType.Enter ? "medium" : "low",
      data: {
        zone_name: data.region.identifier,
        latitude: data.region.latitude,
        longitude: data.region.longitude,
        radius: data.region.radius
      }
    });
  });
}

export async function getStoredZones(): Promise<GeofenceZone[]> {
  const raw = await AsyncStorage.getItem(ZONES_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_ZONES;
  }

  try {
    const parsed = JSON.parse(raw) as GeofenceZone[];
    return parsed.length > 0 ? parsed : DEFAULT_ZONES;
  } catch (error) {
    console.warn("Failed to parse stored geofence zones", error);
    return DEFAULT_ZONES;
  }
}

export async function setStoredZones(zones: GeofenceZone[]) {
  await AsyncStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones));
}

export const startGeofencing = async (zones?: GeofenceZone[]) => {
  const foreground = await Location.requestForegroundPermissionsAsync();
  const background = await Location.requestBackgroundPermissionsAsync();
  if (foreground.status !== "granted" || background.status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const resolvedZones = zones && zones.length > 0 ? zones : await getStoredZones();
  const normalizedZones = normalizeZones(resolvedZones);
  await setStoredZones(resolvedZones);
  await stopGeofencing();

  await Location.startGeofencingAsync(GEOFENCING_TASK, normalizedZones);
};

export const stopGeofencing = async () => {
  const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
  if (hasStarted) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK);
  }
};

export { DEFAULT_ZONES, HOME_ZONE, WORK_ZONE };
export type { GeofenceZone };
