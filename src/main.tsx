
// Create a complete Buffer polyfill if needed
(function initializeCompleteBuffer() {
  if (typeof window !== 'undefined') {
    console.log('Initializing Buffer in main.tsx');
    
    try {
      // Make sure Buffer is available and fully featured
      if (!window.Buffer || !window.Buffer.from) {
        console.log('Buffer.from missing, creating implementation');
        
        // Use buffer from CDN (loaded in index.html)
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          console.log('Using Buffer from CDN');
          window.Buffer = window.buffer.Buffer;
          
          // Ensure Buffer.from exists
          if (!window.Buffer.from) {
            console.log('Creating Buffer.from polyfill');
            window.Buffer.from = function(data, encoding) {
              if (typeof data === 'string') {
                return new window.Buffer(data, encoding);
              }
              return new window.Buffer(data);
            };
          }
        }
      }
      
      // Ensure Buffer is available in globalThis
      if (typeof globalThis !== 'undefined') {
        globalThis.Buffer = window.Buffer;
      }
      
      // Test Buffer.from
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
