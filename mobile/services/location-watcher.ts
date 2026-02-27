import * as Location from "expo-location";
import { postEvent } from "./server-api";

type GeofenceZone = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

let locationSub: Location.LocationSubscription | null = null;
const insideZones = new Set<string>();

const toRad = (value: number) => (value * Math.PI) / 180;

const distanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const startGeofencing = async (zones: GeofenceZone[]) => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  await stopGeofencing();

  locationSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 10000
    },
    async (position) => {
      const { latitude, longitude } = position.coords;

      for (const zone of zones) {
        const distance = distanceMeters(latitude, longitude, zone.latitude, zone.longitude);
        const isInside = distance <= zone.radius;
        const alreadyInside = insideZones.has(zone.name);

        if (isInside && !alreadyInside) {
          insideZones.add(zone.name);
          await postEvent({
            type: "geofence_enter",
            source: "mobile/gps",
            severity: "medium",
            data: {
              zone_name: zone.name,
              latitude,
              longitude
            }
          });
        }

        if (!isInside && alreadyInside) {
          insideZones.delete(zone.name);
          await postEvent({
            type: "geofence_exit",
            source: "mobile/gps",
            severity: "low",
            data: {
              zone_name: zone.name,
              latitude,
              longitude
            }
          });
        }
      }
    }
  );
};

export const stopGeofencing = async () => {
  if (locationSub) {
    locationSub.remove();
    locationSub = null;
  }
};

export type { GeofenceZone };
