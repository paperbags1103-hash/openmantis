import * as Network from "expo-network";
import { sendEvent } from "./server-api";

export class WifiWatcher {
  private subscription: { remove: () => void } | null = null;
  private lastSignature: string | null = null;

  async start() {
    try {
      const initial = await Network.getNetworkStateAsync();
      await this.handleState(initial);

      this.subscription = Network.addNetworkStateListener((state) => {
        this.handleState(state).catch((error) => {
          console.warn("[ClaWire] Wi-Fi listener error:", error);
        });
      });
    } catch (error) {
      console.warn("[ClaWire] Failed to start WifiWatcher:", error);
    }
  }

  private async handleState(state: Network.NetworkState) {
    try {
      const signature = `${state.type}:${state.isConnected}:${state.isInternetReachable}`;
      if (signature === this.lastSignature) return;
      this.lastSignature = signature;

      await sendEvent({
        type: "wifi_state",
        source: "mobile/wifi",
        severity: "low",
        data: {
          type: state.type,
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable ?? null
        }
      }).catch(() => {});

      if (state.type === Network.NetworkStateType.WIFI && state.isConnected) {
        await sendEvent({
          type: "wifi_connected",
          source: "mobile/wifi",
          severity: "low",
          data: {
            isConnected: true,
            isInternetReachable: state.isInternetReachable ?? null
          }
        }).catch(() => {});
      }

      if (!state.isConnected) {
        await sendEvent({
          type: "wifi_disconnected",
          source: "mobile/wifi",
          severity: "medium",
          data: {
            isConnected: false,
            networkType: state.type
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.warn("[ClaWire] Wi-Fi state handling error:", error);
    }
  }

  stop() {
    try {
      this.subscription?.remove();
      this.subscription = null;
      this.lastSignature = null;
    } catch (error) {
      console.warn("[ClaWire] Failed to stop WifiWatcher:", error);
    }
  }
}
