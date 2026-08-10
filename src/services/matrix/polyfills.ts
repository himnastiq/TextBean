/**
 * Polyfills required for matrix-js-sdk to run in React Native.
 * Must be imported BEFORE any matrix-js-sdk imports.
 *
 * Simplified for v1 (no E2EE — no WASM/Rust crypto needed).
 */

import { getRandomValues } from 'expo-crypto';
import { MMKV } from 'react-native-mmkv';

// --- TextEncoder / TextDecoder ---
// React Native doesn't provide these globally but matrix-js-sdk needs them.
if (typeof globalThis.TextEncoder === 'undefined') {
  // Use the built-in from React Native's Hermes engine (available since 0.72)
  // If not available, a minimal polyfill is provided.
  try {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
  } catch {
    // Hermes should have TextEncoder built-in for SDK 56+
    // This catch is a safety net
  }
}

// --- crypto.getRandomValues ---
// matrix-js-sdk uses this for random ID generation.
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto;
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = getRandomValues as typeof globalThis.crypto.getRandomValues;
}

// --- localStorage shim via MMKV ---
// matrix-js-sdk's MemoryStore falls back to localStorage for some operations.
// We provide a thin shim backed by MMKV for persistence.
const mmkv = new MMKV({ id: 'matrix-localstorage' });

const localStorageShim: Storage = {
  get length(): number {
    return mmkv.getAllKeys().length;
  },
  clear(): void {
    mmkv.clearAll();
  },
  getItem(key: string): string | null {
    return mmkv.getString(key) ?? null;
  },
  key(index: number): string | null {
    const keys = mmkv.getAllKeys();
    return keys[index] ?? null;
  },
  removeItem(key: string): void {
    mmkv.remove(key);
  },
  setItem(key: string, value: string): void {
    mmkv.set(key, value);
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageShim,
    writable: false,
    configurable: true,
  });
}

export { localStorageShim, mmkv };
