
// Check if Buffer is already defined and assign it explicitly
import { Buffer as BufferPolyfill } from 'buffer';

// Make absolutely sure Buffer is available globally
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || BufferPolyfill;
  console.log('Buffer initialized in main.tsx:', !!window.Buffer);
  console.log('Buffer.from available:', typeof window.Buffer.from === 'function');
}

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
