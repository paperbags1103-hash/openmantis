import * as Calendar from "expo-calendar";
import { sendEvent } from "./server-api";

export class CalendarWatcher {
  private interval: ReturnType<typeof setInterval> | null = null;
  private sentEventKeys = new Set<string>();

  async start() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") return;

      const check = async () => {
        try {
          const now = new Date();
          const in90min = new Date(now.getTime() + 90 * 60 * 1000);
          const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
          const ids = calendars.map((c) => c.id);
          if (!ids.length) return;

          const events = await Calendar.getEventsAsync(ids, now, in90min);

          for (const event of events) {
            const minutesUntil = Math.round((new Date(event.startDate).getTime() - now.getTime()) / 60000);
            if (minutesUntil < 25 || minutesUntil > 35) continue;

            const dedupeKey = `${event.id}:${new Date(event.startDate).toISOString()}`;
            if (this.sentEventKeys.has(dedupeKey)) continue;
            this.sentEventKeys.add(dedupeKey);

            await sendEvent({
              type: "calendar_upcoming",
              source: "mobile/calendar",
              severity: "medium",
              data: {
                title: event.title,
                startTime: event.startDate,
                minutesUntil,
                location: event.location ?? null,
                isAllDay: event.allDay
              }
            }).catch(() => {});
          }
        } catch (error) {
          console.warn("[ClaWire] Calendar check error:", error);
        }
      };

      await check();
      this.interval = setInterval(check, 10 * 60 * 1000);
    } catch (error) {
      console.warn("[ClaWire] Failed to start CalendarWatcher:", error);
    }
  }

  stop() {
    try {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
      this.sentEventKeys.clear();
    } catch (error) {
      console.warn("[ClaWire] Failed to stop CalendarWatcher:", error);
    }
  }
}
