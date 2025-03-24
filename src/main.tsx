
// Force global Buffer to be correctly initialized before any imports
(function initializeBuffer() {
  // Dynamically import buffer if needed
  if (typeof window !== 'undefined') {
    // If window.Buffer doesn't exist or Buffer.from is not a function
    if (!window.Buffer || typeof window.Buffer.from !== 'function') {
      console.log('Fixing Buffer in main.tsx');
      try {
        // Use the buffer from the CDN if available
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          window.Buffer = window.buffer.Buffer;
        } else {
          // Import from buffer module as last resort
          const BufferModule = require('buffer');
          window.Buffer = BufferModule.Buffer;
        }
        
        // Verify Buffer.from is now working
        console.log('Buffer.from available in main.tsx:', typeof window.Buffer.from === 'function');
        
        // Test Buffer functionality
        const testBuffer = window.Buffer.from('test');
        console.log('Buffer.from test successful in main.tsx:', testBuffer instanceof Uint8Array);
      } catch (e) {
        console.error('Error initializing Buffer in main.tsx:', e);
      }
    }
  }
})();

// Now we can safely import React and other dependencies
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
