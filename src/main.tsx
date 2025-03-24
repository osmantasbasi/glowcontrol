
// Force global Buffer to be correctly initialized before any imports
(function initializeBuffer() {
  // Ensure Buffer is properly set up in the global scope before any imports
  if (typeof window !== 'undefined') {
    console.log('Initializing Buffer in main.tsx');
    
    try {
      // Check if global Buffer exists and has .from method
      if (!window.Buffer || typeof window.Buffer.from !== 'function') {
        console.log('Buffer or Buffer.from missing, configuring from polyfill');
        
        // Use buffer from CDN if available (should be loaded in index.html)
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          console.log('Using buffer from CDN');
          window.Buffer = window.buffer.Buffer;
        } else {
          console.log('Attempting to load Buffer from module');
          // Last resort - try to import from the buffer module
          const BufferModule = require('buffer');
          window.Buffer = BufferModule.Buffer;
        }
        
        // Double-check that Buffer.from is now available
        if (!window.Buffer || typeof window.Buffer.from !== 'function') {
          console.error('Buffer.from is still not available after initialization!');
        } else {
          console.log('Buffer.from is now available in main.tsx');
        }
      }
      
      // Log success and test Buffer.from
      console.log('Buffer check in main.tsx - Buffer.from available:', typeof window.Buffer?.from === 'function');
      const testBuffer = window.Buffer.from('test');
      console.log('Buffer.from test in main.tsx:', testBuffer instanceof Uint8Array);
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
