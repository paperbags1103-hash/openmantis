import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="agents" options={{ title: "Agents" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
