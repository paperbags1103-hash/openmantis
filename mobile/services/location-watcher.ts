import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { sendEvent } from "./server-api";
import { loadZones, type Zone } from "./zones";

const GEOFENCING_TASK = "clawire-geofencing-task";

const normalizeZones = (zones: Zone[]) => {
  return zones.map((zone) => ({
    identifier: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radius: zone.radius,
    notifyOnEnter: true,
    notifyOnExit: true,
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
    const zones = await loadZones();
    const zone = zones.find((item) => item.id === data.region.identifier);

    await sendEvent({
      type: eventType,
      source: "mobile/gps",
      severity: data.eventType === Location.GeofencingEventType.Enter ? "medium" : "low",
      data: {
        zone_id: data.region.identifier,
        zone_label: zone?.label ?? data.region.identifier,
        zone_emoji: zone?.emoji ?? "📍",
        latitude: data.region.latitude,
        longitude: data.region.longitude,
        radius: data.region.radius,
      },
    });
  });
}

export const startGeofencing = async (zones?: Zone[]) => {
  const foreground = await Location.requestForegroundPermissionsAsync();
  const background = await Location.requestBackgroundPermissionsAsync();
  if (foreground.status !== "granted" || background.status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const resolvedZones = zones && zones.length > 0 ? zones : await loadZones();
  if (resolvedZones.length === 0) {
    console.warn("[ClaWire] No zones configured. Geofencing not registered.");
    await stopGeofencing();
    return;
  }

  await stopGeofencing();
  await Location.startGeofencingAsync(GEOFENCING_TASK, normalizeZones(resolvedZones));
};

export const stopGeofencing = async () => {
  const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
  if (hasStarted) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK);
  }
};

export const reloadZones = async () => {
  await stopGeofencing();
  await startGeofencing();
};

export type GeofenceZone = Zone;
