import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function VoiceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎤 음성 어시스턴트</Text>
      <Text style={styles.subtitle}>준비 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center"
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#888", fontSize: 16, marginTop: 8 }
});
