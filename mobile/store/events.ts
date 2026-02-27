import { create } from "zustand";

export type EventItem = {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  createdAt: string;
  data?: Record<string, unknown>;
};

type EventsState = {
  events: EventItem[];
  addEvent: (event: EventItem) => void;
  clearEvents: () => void;
  setEvents: (events: EventItem[]) => void;
};

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),
  clearEvents: () => set({ events: [] }),
  setEvents: (events) => set({ events })
}));
