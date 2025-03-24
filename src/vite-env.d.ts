
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: any; // Using 'any' to avoid TypeScript errors with the polyfill
  process: {
    env: Record<string, string>;
  };
}
