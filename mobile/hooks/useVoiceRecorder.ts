import { useState, useRef } from "react";
import { Audio } from "expo-av";
import { useSettingsStore } from "../store/settings";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
    setIsRecording(true);
  };

  const stopAndSend = async (context?: string) => {
    if (!recordingRef.current) return null;
    setIsRecording(false);
    setIsProcessing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI()!;
      recordingRef.current = null;

      const serverUrl = useSettingsStore.getState().serverUrl;
      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/m4a", name: "recording.m4a" } as any);
      if (context) formData.append("context", context);

      const res = await fetch(`${serverUrl}/api/voice/chat`, {
        method: "POST",
        body: formData,
      });
      return await res.json();
    } catch (e) {
      console.error("[voice] Error:", e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { isRecording, isProcessing, startRecording, stopAndSend };
}
