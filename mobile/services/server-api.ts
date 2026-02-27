import axios from "axios";
import { DEFAULT_SERVER_URL } from "../constants";

let activeServerUrl =
  process.env.EXPO_PUBLIC_SERVER_URL || process.env.SERVER_URL || DEFAULT_SERVER_URL;

const api = axios.create({
  baseURL: activeServerUrl,
  timeout: 8000
});

export const setServerUrl = (url: string) => {
  activeServerUrl = url;
  api.defaults.baseURL = url;
};

export type PostEventInput = {
  type: string;
  source: string;
  severity?: "high" | "medium" | "low";
  data?: Record<string, unknown>;
};

export const postEvent = async (event: PostEventInput) => {
  const { data } = await api.post("/api/events", event);
  return data;
};

export const getRecentEvents = async () => {
  const { data } = await api.get("/api/events/recent");
  return data as Array<{
    id: string;
    type: string;
    severity: "high" | "medium" | "low";
    createdAt: string;
    data?: Record<string, unknown>;
  }>;
};

export const approveReaction = async (id: string, decision: "approve" | "reject") => {
  const { data } = await api.post(`/api/reactions/${id}/decision`, { decision });
  return data;
};
