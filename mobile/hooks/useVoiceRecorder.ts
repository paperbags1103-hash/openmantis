import { useState, useRef } from "react";
import { Audio } from "expo-av";
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

      const serverUrl = useSettingsStore.getState().serverUrl;
      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/m4a", name: "recording.m4a" } as any);

      const res = await fetch(`${serverUrl}/api/voice/chat`, {
        method: "POST",
        body: formData,
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
