import * as Battery from "expo-battery";
import { sendEvent } from "./server-api";

export class BatteryWatcher {
  private subscription: Battery.BatteryStateSubscription | null = null;
  private levelInterval: ReturnType<typeof setInterval> | null = null;

  async start() {
    try {
      this.subscription = Battery.addBatteryStateListener(async ({ batteryState }) => {
        try {
          const level = await Battery.getBatteryLevelAsync();
          const levelPct = Math.round(level * 100);

          if (batteryState === Battery.BatteryState.CHARGING) {
            await sendEvent({
              type: "battery_charging",
              source: "mobile/battery",
              severity: "low",
              data: { level: levelPct, charging: true }
            });
          } else if (batteryState === Battery.BatteryState.FULL) {
            await sendEvent({
              type: "battery_full",
              source: "mobile/battery",
              severity: "low",
              data: { level: levelPct, charging: true }
            });
          }
        } catch (error) {
          console.warn("[ClaWire] Battery state listener error:", error);
        }
      });

      const checkLow = async () => {
        try {
          const level = await Battery.getBatteryLevelAsync();
          const state = await Battery.getBatteryStateAsync();
          const levelPct = Math.round(level * 100);

          if (levelPct <= 20 && state !== Battery.BatteryState.CHARGING) {
            await sendEvent({
              type: "battery_low",
              source: "mobile/battery",
              severity: "medium",
              data: { level: levelPct, charging: false }
            });
          }
        } catch (error) {
          console.warn("[ClaWire] Battery low check error:", error);
        }
      };

      await checkLow();
      this.levelInterval = setInterval(checkLow, 5 * 60 * 1000);
    } catch (error) {
      console.warn("[ClaWire] Failed to start BatteryWatcher:", error);
    }
  }

  stop() {
    try {
      this.subscription?.remove();
      this.subscription = null;
      if (this.levelInterval) {
        clearInterval(this.levelInterval);
        this.levelInterval = null;
      }
    } catch (error) {
      console.warn("[ClaWire] Failed to stop BatteryWatcher:", error);
    }
  }
}
