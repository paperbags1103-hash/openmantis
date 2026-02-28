import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  severity?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PostEventPayload {
  type: string;
  source: string;
  severity?: string;
  data?: Record<string, unknown>;
}

export async function getServerUrl(): Promise<string> {
  const serverUrl = await AsyncStorage.getItem("clawire_server_url");
  if (!serverUrl) {
    throw new Error("ClaWire server URL not configured");
  }

  return serverUrl;
}

async function getClient() {
  const serverUrl = await getServerUrl();
  return axios.create({ baseURL: serverUrl, timeout: 10000 });
}

export async function postEvent(payload: PostEventPayload) {
  const client = await getClient();
  const res = await client.post("/api/events", payload);
  return res.data;
}

export async function sendEvent(payload: PostEventPayload) {
  return postEvent(payload);
}

export async function getRecentEvents(limit = 50): Promise<AgentEvent[]> {
  const client = await getClient();
  const res = await client.get(`/api/events/recent?limit=${limit}`);
  return res.data.events ?? [];
}

export async function getHealth() {
  const client = await getClient();
  const res = await client.get("/api/health");
  return res.data;
}

export async function approveReaction(reactionId: string, decision: "approved" | "rejected" | "deferred") {
  const client = await getClient();
  const res = await client.post(`/api/reactions/${reactionId}/approve`, { decision });
  return res.data;
}
