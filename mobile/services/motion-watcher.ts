import { DeviceMotion } from "expo-sensors";
import { sendEvent } from "./server-api";

type MotionState = "still" | "moving";

export class MotionWatcher {
  private subscription: { remove: () => void } | null = null;
  private currentState: MotionState = "still";
  private stillSince: number = Date.now();
  private lastMovingEventAt = 0;
  private lastStillEventAt = 0;

  async start() {
    try {
      DeviceMotion.setUpdateInterval(2000);
      this.subscription = DeviceMotion.addListener(async (measurement) => {
        try {
          const accel = measurement.acceleration;
          if (!accel) return;

          const magnitude = Math.sqrt((accel.x ?? 0) ** 2 + (accel.y ?? 0) ** 2 + (accel.z ?? 0) ** 2);
          const isMoving = magnitude >= 1.2;
          const now = Date.now();

          if (isMoving) {
            this.stillSince = now;
            if (this.currentState !== "moving" && now - this.lastMovingEventAt > 30000) {
              this.currentState = "moving";
              this.lastMovingEventAt = now;
              await sendEvent({
                type: "motion_active",
                source: "mobile/motion",
                severity: "low",
                data: { magnitude: Number(magnitude.toFixed(3)) }
              }).catch(() => {});
            }
            return;
          }

          if (this.currentState !== "still") {
            this.currentState = "still";
            this.stillSince = now;
          }

          const stillSeconds = Math.round((now - this.stillSince) / 1000);
          if (stillSeconds >= 60 && now - this.lastStillEventAt > 120000) {
            this.lastStillEventAt = now;
            await sendEvent({
              type: "motion_still",
              source: "mobile/motion",
              severity: "low",
              data: { stillSeconds }
            }).catch(() => {});
          }
        } catch (error) {
          console.warn("[ClaWire] Motion listener error:", error);
        }
      });
    } catch (error) {
      console.warn("[ClaWire] Failed to start MotionWatcher:", error);
    }
  }

  stop() {
    try {
      this.subscription?.remove();
      this.subscription = null;
    } catch (error) {
      console.warn("[ClaWire] Failed to stop MotionWatcher:", error);
    }
  }
}
