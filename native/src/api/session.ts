import * as SecureStore from 'expo-secure-store';
import { DEV_TOKEN } from './config';

// Holds the access_token sent as the X-Access-Token header. Persisted in the
// device keychain; falls back to DEV_TOKEN so the app is testable before the
// Phase 5 auth flow exists.
const KEY = 'spontany_access_token';
let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached ?? null;
  try {
    const stored = await SecureStore.getItemAsync(KEY);
    cached = stored ?? (DEV_TOKEN || null);
  } catch {
    cached = DEV_TOKEN || null; // SecureStore is unavailable on web
  }
  return cached;
}

export async function setToken(token: string | null): Promise<void> {
  cached = token;
  try {
    if (token) await SecureStore.setItemAsync(KEY, token);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* ignore on web */
  }
}
