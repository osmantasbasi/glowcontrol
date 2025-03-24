
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: typeof Buffer & {
    from: (data: string | ArrayBuffer | SharedArrayBuffer, encoding?: string) => any;
  };
  process: {
    env: Record<string, string>;
  };
}
