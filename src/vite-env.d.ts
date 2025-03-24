/// <reference types="vite/client" />

// Add Buffer to the global Window interface
interface Window {
  Buffer: typeof Buffer; 
  buffer?: {
    Buffer: typeof Buffer;
  };
  process: {
    env: Record<string, string>;
  };
}

// Declare global Buffer variable properly
declare global {
  // Use the same type as Node.js for Buffer
  interface BufferConstructor {
    new(str: string, encoding?: string): Buffer;
    new(size: number): Buffer;
    new(array: Uint8Array | number[]): Buffer;
    prototype: Buffer;
    from(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number): Buffer;
    from(data: Uint8Array | readonly number[]): Buffer;
    from(data: any): Buffer;
    from(str: string, encoding?: string): Buffer;
    alloc(size: number, fill?: any, encoding?: string): Buffer;
    // Add other methods as needed
  }
  
  interface Buffer extends Uint8Array {
    write(string: string, offset?: number, length?: number, encoding?: string): number;
    toString(encoding?: string, start?: number, end?: number): string;
    toJSON(): { type: 'Buffer'; data: number[] };
    equals(otherBuffer: Uint8Array): boolean;
    compare(otherBuffer: Uint8Array): number;
    copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
    slice(start?: number, end?: number): Buffer;
    // ... other Buffer methods
  }
  
  var Buffer: BufferConstructor;
  
  namespace NodeJS {
    interface Global {
      Buffer: typeof Buffer;
    }
  }
  
  // Ensure Buffer is available in globalThis
  interface globalThis {
    Buffer: typeof Buffer;
  }
}
