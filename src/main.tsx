
// Import and set up Buffer polyfill first
import { Buffer } from 'buffer';

// Make Buffer available globally - this needs to happen before any MQTT code runs
window.Buffer = Buffer;

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
