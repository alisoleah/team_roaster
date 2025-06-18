import { useContext } from 'react';
import { FirebaseContext } from '../contexts/FirebaseContext.js';

// --- Custom Hook for Firebase Context ---
// Simplifies accessing Firebase services and user data.
function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export { useFirebase };
