
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: any; // Using 'any' to avoid TypeScript errors with the polyfill
  buffer?: {
    Buffer: any; // Some Buffer implementations expose it through window.buffer.Buffer
  };
  process: {
    env: Record<string, string>;
  };
}

// Ensure global Buffer is declared
declare global {
  var Buffer: any;
}
