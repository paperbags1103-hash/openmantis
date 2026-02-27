import React, { useState } from "react";
import {
  View, Text, FlatList, Pressable,
  ActivityIndicator, StyleSheet, SafeAreaView
} from "react-native";
import * as Speech from "expo-speech";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
}

export default function VoiceScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "agent", text: "안녕하세요! 마이크를 누르고 말씀해주세요." }
  ]);
  const { isRecording, isProcessing, startRecording, stopAndSend } = useVoiceRecorder();

  const handleRelease = async () => {
    const result = await stopAndSend();
    if (!result) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "agent",
        text: "⚠️ 서버 연결 실패. Settings에서 서버 URL을 확인하세요."
      }]);
      return;
    }

    const userText = result.transcript ?? "(인식 실패)";
    const agentText = result.response?.text ?? "응답을 받지 못했습니다.";

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: userText },
      { id: `a-${Date.now()}`, role: "agent", text: agentText },
    ]);

    Speech.speak(agentText, { language: "ko-KR", rate: 1.0 });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.agentBubble]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {isRecording ? "🔴 녹음 중... 손 떼면 전송" : isProcessing ? "⏳ 처리 중..." : "🎤 길게 눌러서 말하기"}
        </Text>
        <Pressable
          onPressIn={startRecording}
          onPressOut={handleRelease}
          disabled={isProcessing}
          style={[styles.micBtn, isRecording && styles.micBtnActive, isProcessing && styles.micBtnDisabled]}
        >
          {isProcessing
            ? <ActivityIndicator color="#fff" size="large" />
            : <Text style={styles.micIcon}>{isRecording ? "⏺" : "🎤"}</Text>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { backgroundColor: "#2563EB", alignSelf: "flex-end" },
  agentBubble: { backgroundColor: "#1f1f1f", alignSelf: "flex-start" },
  bubbleText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  footer: { paddingVertical: 20, alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#1f1f1f" },
  hint: { color: "#888", fontSize: 13 },
  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#2563EB",
    alignItems: "center", justifyContent: "center",
  },
  micBtnActive: { backgroundColor: "#DC2626", transform: [{ scale: 1.1 }] },
  micBtnDisabled: { backgroundColor: "#444" },
  micIcon: { fontSize: 32 },
});
