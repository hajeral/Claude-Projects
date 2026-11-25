// Login tokens live in the phone's secure storage (iOS Keychain, Android Keystore),
// never in AsyncStorage. On the web preview there is no secure storage, so tokens are
// kept in memory only and you sign in again after a reload.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Tokens = { access: string; refresh: string; expiresAt: number };
const KEY = 'wb.tokens';
let memory: Tokens | null = null;

export async function getTokens(): Promise<Tokens | null> {
  if (memory) return memory;
  if (Platform.OS === 'web') return null;
  try { const raw = await SecureStore.getItemAsync(KEY); memory = raw ? (JSON.parse(raw) as Tokens) : null; } catch { memory = null; }
  return memory;
}
export async function setTokens(t: Tokens | null) {
  memory = t;
  if (Platform.OS === 'web') return;
  if (t) await SecureStore.setItemAsync(KEY, JSON.stringify(t), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(KEY);
}
