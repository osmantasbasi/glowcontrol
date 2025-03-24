
/// <reference types="vite/client" />

// Add Buffer to the global Window interface with flexible typing
interface Window {
  Buffer: any; // Using 'any' to avoid TypeScript errors with polyfills
  buffer?: {
    Buffer: any; // The buffer polyfill exposes this
  };
  process: {
    env: Record<string, string>;
  };
}

// Declare global Buffer variable with flexible typing
declare global {
  var Buffer: any;
  interface BufferConstructor {
    from(data: any, encodingOrOffset?: string | number, length?: number): Uint8Array;
    alloc(size: number, fill?: any, encoding?: string): Uint8Array;
    // Add other methods as needed
  }
  
  namespace NodeJS {
    interface Global {
      Buffer: any;
    }
  }
}
