
// Force global Buffer to be correctly initialized before any imports
(function initializeBuffer() {
  // Ensure Buffer is properly set up in the global scope before any imports
  if (typeof window !== 'undefined') {
    console.log('Initializing Buffer in main.tsx');
    
    try {
      // Check if global Buffer exists
      if (!window.Buffer) {
        console.log('Buffer missing, configuring from polyfill');
        
        // Use buffer from CDN if available (loaded in index.html)
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          console.log('Using buffer from CDN');
          window.Buffer = window.buffer.Buffer;
        }
      }
      
      // Explicitly ensure Buffer is available in globalThis
      if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
        globalThis.Buffer = window.Buffer;
      }
      
      // Log success and test Buffer.from
      console.log('Buffer check in main.tsx - Buffer.from available:', typeof window.Buffer?.from === 'function');
      if (typeof window.Buffer?.from === 'function') {
        const testBuffer = window.Buffer.from('test');
        console.log('Buffer.from test in main.tsx:', testBuffer instanceof Uint8Array, 'Content:', Array.from(testBuffer).toString());
      }
    } catch (e) {
      console.error('Error initializing Buffer in main.tsx:', e);
    }
  }
})();

// Now we can safely import React and other dependencies
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
