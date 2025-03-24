
// Buffer polyfill configuration - must be done before any imports
import { Buffer as BufferPolyfill } from 'buffer';

// Make absolutely sure Buffer is available globally with all methods
if (typeof window !== 'undefined') {
  // First check if Buffer exists but doesn't have the 'from' method
  if (!window.Buffer || typeof window.Buffer.from !== 'function') {
    console.log('Initializing Buffer with full implementation');
    window.Buffer = BufferPolyfill;
    
    // Explicitly create the polyfill methods if they don't exist
    if (typeof window.Buffer.from !== 'function') {
      console.log('Adding Buffer.from method');
      window.Buffer.from = BufferPolyfill.from;
    }
  }
  
  console.log('Buffer check in main.tsx:', !!window.Buffer);
  console.log('Buffer.from check in main.tsx:', typeof window.Buffer.from === 'function');
}

// Only load React after Buffer is properly configured
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
