export type SmartphoneSignalType =
  | "geofence_enter"
  | "geofence_exit"
  | "battery_low"
  | "battery_charging"
  | "battery_full"
  | "app_foreground"
  | "app_background"
  | "calendar_upcoming"
  | "calendar_started"
  | "wifi_connected"
  | "wifi_disconnected"
  | "motion_walking"
  | "motion_stationary"
  | "motion_vehicle"
  | "screen_on"
  | "screen_off"
  | "voice_query";

export interface AgentEvent {
  id: string;
  type: SmartphoneSignalType | string;
  source: string;
  timestamp: string;
  severity?: "low" | "medium" | "high" | string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
