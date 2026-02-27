import { AppStateWatcher } from "./app-state-watcher";
import { BatteryWatcher } from "./battery-watcher";
import { CalendarWatcher } from "./calendar-watcher";
import { MotionWatcher } from "./motion-watcher";
import { WifiWatcher } from "./wifi-watcher";

const batteryWatcher = new BatteryWatcher();
const appStateWatcher = new AppStateWatcher();
const calendarWatcher = new CalendarWatcher();
const wifiWatcher = new WifiWatcher();
const motionWatcher = new MotionWatcher();

export async function startAllWatchers() {
  appStateWatcher.start();
  await Promise.allSettled([
    batteryWatcher.start(),
    calendarWatcher.start(),
    wifiWatcher.start(),
    motionWatcher.start()
  ]);
  console.log("[ClaWire] All signal watchers started");
}

export function stopAllWatchers() {
  batteryWatcher.stop();
  appStateWatcher.stop();
  calendarWatcher.stop();
  wifiWatcher.stop();
  motionWatcher.stop();
}
