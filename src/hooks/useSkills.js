import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { appId } from '../config/firebase.js';

// Hook to manage all skills
const useSkills = (db) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false); // Set loading to false if db is not available
      // setError("Firestore database instance is not available."); // Optionally set an error
      return;
    }

    const skillsColRef = collection(db, `artifacts/${appId}/public/data/skills`);
    const unsubscribe = onSnapshot(skillsColRef,
      (snapshot) => {
        const skillsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSkills(skillsList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching skills:", err);
        setError("Failed to load skills.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, appId]); // Added appId to dependency array as it's used in collection path

  return { skills, loading, error };
};

export { useSkills };
