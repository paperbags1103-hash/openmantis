import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSettingsStore } from '../store/settings';

interface SetupPayload {
  url: string;
  token: string;
}

function isSetupPayload(value: unknown): value is SetupPayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as SetupPayload).url === 'string' &&
      typeof (value as SetupPayload).token === 'string'
  );
}

async function pairDevice(baseUrl: string, setupToken: string): Promise<void> {
  const permissions = await Notifications.requestPermissionsAsync();
  if (permissions.status !== 'granted') {
    throw new Error('Push notification permission is required for pairing');
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '69a35948-4619-4898-8b6c-9408d84f0470',
  });

  const response = await fetch(`${baseUrl}/setup/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expo_push_token: tokenData.data,
      setup_token: setupToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pairing failed: ${response.status}`);
  }
}

export default function SetupScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualUrl, setManualUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const setServerUrl = useSettingsStore((state) => state.setServerUrl);

  const finishSetup = useCallback(
    async (url: string, token?: string) => {
      const normalizedUrl = url.trim().replace(/\/+$/, '');
      await AsyncStorage.setItem('clawire_server_url', normalizedUrl);
      setServerUrl(normalizedUrl);

      if (token) {
        await AsyncStorage.setItem('clawire_setup_token', token);
        await pairDevice(normalizedUrl, token);
      }

      router.replace('/(tabs)/feed');
    },
    [setServerUrl]
  );

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (busy) {
        return;
      }

      setBusy(true);
      try {
        const parsed = JSON.parse(data) as unknown;
        if (!isSetupPayload(parsed)) {
          throw new Error('Invalid QR payload');
        }

        await finishSetup(parsed.url, parsed.token);
      } catch (error) {
        Alert.alert('Setup failed', error instanceof Error ? error.message : 'QR parsing failed');
      } finally {
        setBusy(false);
      }
    },
    [busy, finishSetup]
  );

  const onManualConnect = useCallback(async () => {
    if (!manualUrl.trim()) {
      return;
    }

    setBusy(true);
    try {
      await finishSetup(manualUrl);
    } catch (error) {
      Alert.alert('Setup failed', error instanceof Error ? error.message : 'Could not save server URL');
    } finally {
      setBusy(false);
    }
  }, [finishSetup, manualUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ClaWire Setup</Text>
      <Text style={styles.subtitle}>Scan the pairing QR from your server.</Text>

      {!permission?.granted ? (
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>Enable camera</Text>
        </Pressable>
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}

      <TextInput
        value={manualUrl}
        onChangeText={setManualUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter URL manually"
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={() => void onManualConnect()} disabled={busy}>
        <Text style={styles.buttonText}>Connect manually</Text>
      </Pressable>

      {busy ? <ActivityIndicator style={styles.spinner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 24,
  },
  camera: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  spinner: {
    marginTop: 16,
  },
});
