
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: any; // Using 'any' to avoid TypeScript errors with the polyfill
  buffer?: {
    Buffer: any; // The buffer polyfill exposes this
  };
  process: {
    env: Record<string, string>;
  };
}

// Declare global Buffer variable to avoid TypeScript errors
declare global {
  var Buffer: any;
  namespace NodeJS {
    interface Global {
      Buffer: any;
    }
  }
}
