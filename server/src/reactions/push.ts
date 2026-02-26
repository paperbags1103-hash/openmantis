import { Expo } from "expo-server-sdk";

const expo = new Expo();

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error("Invalid Expo push token");
  }

  await expo.sendPushNotificationsAsync([
    {
      to: token,
      sound: "default",
      title,
      body,
      data,
    },
  ]);
}
