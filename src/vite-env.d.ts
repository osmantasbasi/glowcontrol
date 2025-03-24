
/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: any; // Use 'any' to prevent type errors with our polyfill
  buffer?: {
    Buffer: any;
  };
  process: {
    env: Record<string, string>;
  };
}

// Declare global Buffer variable with a more flexible type
declare global {
  // Use a more flexible Buffer type that matches our polyfill capabilities
  var Buffer: any;
  
  // Ensure Buffer is available in globalThis
  interface globalThis {
    Buffer: any;
  }
}
