import React, { useState, useEffect, createContext, useContext } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb, auth as firebaseAuth, appId, initialAuthToken } from '../config/firebase.js'; // Renamed imports for clarity

// --- Firebase Context ---
// Provides Firebase instances (db, auth) and user information throughout the app.
const FirebaseContext = createContext(null);

// --- Firebase Provider Component ---
// Initializes Firebase and handles authentication.
function FirebaseProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if auth state has been checked

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Set up authentication state observer
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            // User is signed in, fetch user details from Firestore
            const userDocRef = doc(firestoreDb, `artifacts/${appId}/public/data/users`, user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              setCurrentUser({ ...user, ...userDocSnap.data(), id: user.uid });
            } else {
              // If user exists in Firebase Auth but not in Firestore 'users' collection,
              // it means they are new or a generic anonymous user.
              console.warn("User document not found in Firestore. Creating a default Viewer user.");
              const defaultUser = {
                name: user.email || `Anonymous User ${user.uid.substring(0, 5)}`,
                email: user.email || `${user.uid}@example.com`,
                role: 'Viewer', // Default role for new authenticated users not yet configured by admin
                managerId: null,
                workingHours: '9 AM - 5 PM',
                shiftPattern: 'Day Shift',
                vacationDates: [],
                skills: [],
                srThreshold: 0,
                currentSrCount: 0,
              };
              await setDoc(userDocRef, defaultUser);
              setCurrentUser({ ...user, ...defaultUser, id: user.uid });
            }
          } else {
            // User is signed out
            setCurrentUser(null);
          }
          setIsAuthReady(true); // Auth state has been checked
        });

        // Attempt to sign in with custom token if provided
        // Ensure firebaseAuth is initialized before attempting to sign in
        if (firebaseAuth) {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              // If no custom token, sign in anonymously
              await signInAnonymously(firebaseAuth);
            }
        } else {
            console.error("FirebaseAuth instance is not available.");
            setIsAuthReady(true); // Set ready to avoid infinite loading, but with an error
        }

        return () => unsubscribe(); // Cleanup auth observer on unmount

      } catch (error) {
        console.error("Error during auth setup or signing in:", error);
        setIsAuthReady(true); // Still set ready to avoid infinite loading, but with an error
      }
    }

    // Ensure db and auth are available before initializing auth logic
    if (firestoreDb && firebaseAuth) {
        initializeAuth();
    } else {
        console.error("Firestore DB or Firebase Auth instance is not available from config.");
        setIsAuthReady(true); // Set ready to avoid infinite loading if db/auth are missing
    }
  }, []); // Run once on component mount, db and auth instances are stable from config

  // Provide the Firebase instances and current user to children components
  return (
    <FirebaseContext.Provider value={{ db: firestoreDb, auth: firebaseAuth, currentUser, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export { FirebaseContext, FirebaseProvider };
