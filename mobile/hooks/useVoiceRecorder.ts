import { useState, useRef } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useSettingsStore } from "../store/settings";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // expo-av 16.x API
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.error("[voice] startRecording error:", e);
    }
  };

  const stopAndSend = async () => {
    if (!recordingRef.current) return null;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No recording URI");

      // base64로 읽어서 JSON으로 전송 (RN FormData + multer 호환 이슈 우회)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });

      const serverUrl = useSettingsStore.getState().serverUrl;
      const res = await fetch(`${serverUrl}/api/voice/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType: "audio/m4a" }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("[voice] stopAndSend error:", e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { isRecording, isProcessing, startRecording, stopAndSend };
}
