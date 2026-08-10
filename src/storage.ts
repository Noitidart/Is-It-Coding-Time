interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Referenced via globalThis so the worker build (which type-checks src without the
// DOM lib) still compiles — localStorage exists at runtime in browsers.
const storage = (globalThis as { localStorage?: KeyValueStorage }).localStorage;

export function loadStoredValue(key: string, fallback: string): string {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function storeValue(key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage unavailable — the preference just won't persist.
  }
}
