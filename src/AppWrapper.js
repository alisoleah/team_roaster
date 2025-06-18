import React from 'react';
import { FirebaseProvider } from './contexts/FirebaseContext.js';
import App from './App.js';

// --- Root Component Wrapping the App with Firebase Provider ---
// This is the main component that Canvas will render.
export default function AppWrapper() {
  return (
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  );
}
