import { AppState, AppStateStatus } from "react-native";
import { sendEvent } from "./server-api";

export class AppStateWatcher {
  private lastState: AppStateStatus = "active";
  private backgroundStart: number | null = null;
  private subscription: { remove: () => void } | null = null;

  start() {
    try {
      this.lastState = AppState.currentState;
      this.subscription = AppState.addEventListener("change", async (nextState) => {
        try {
          if (nextState === this.lastState) return;

          const now = Date.now();
          if (nextState === "background" || nextState === "inactive") {
            this.backgroundStart = now;
            await sendEvent({
              type: "app_background",
              source: "mobile/appstate",
              severity: "low",
              data: { state: nextState }
            }).catch(() => {});
          } else if (nextState === "active") {
            const bgDuration = this.backgroundStart ? Math.round((now - this.backgroundStart) / 1000) : 0;
            this.backgroundStart = null;
            await sendEvent({
              type: "app_foreground",
              source: "mobile/appstate",
              severity: "low",
              data: { backgroundDurationSec: bgDuration, likelyWakeUp: bgDuration > 300 }
            }).catch(() => {});
          }
          this.lastState = nextState;
        } catch (error) {
          console.warn("[ClaWire] AppState listener error:", error);
        }
      });
    } catch (error) {
      console.warn("[ClaWire] Failed to start AppStateWatcher:", error);
    }
  }

  stop() {
    try {
      this.subscription?.remove();
      this.subscription = null;
    } catch (error) {
      console.warn("[ClaWire] Failed to stop AppStateWatcher:", error);
    }
  }
}
