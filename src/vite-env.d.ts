
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: typeof Buffer;
  process: {
    env: Record<string, string>;
  };
}
