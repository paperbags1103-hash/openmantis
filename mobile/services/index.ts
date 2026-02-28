import { AppStateWatcher } from "./app-state-watcher";
import { BatteryWatcher } from "./battery-watcher";
import { CalendarWatcher } from "./calendar-watcher";
import { startGeofencing, stopGeofencing } from "./location-watcher";
import { WifiWatcher } from "./wifi-watcher";

const batteryWatcher = new BatteryWatcher();
const appStateWatcher = new AppStateWatcher();
const calendarWatcher = new CalendarWatcher();
const wifiWatcher = new WifiWatcher();
// MotionWatcher removed for v1 App Store compliance — re-add in v1.1

export async function startAllWatchers() {
  appStateWatcher.start();
  await Promise.allSettled([
    batteryWatcher.start(),
    calendarWatcher.start(),
    startGeofencing(),
    wifiWatcher.start()
  ]);
  console.log("[ClaWire] All signal watchers started");
}

export function stopAllWatchers() {
  batteryWatcher.stop();
  appStateWatcher.stop();
  calendarWatcher.stop();
  void stopGeofencing();
  wifiWatcher.stop();
}
