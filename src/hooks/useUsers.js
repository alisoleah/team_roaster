import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { appId } from '../config/firebase.js';

// Hook to manage all users
const useUsers = (db, currentUserId) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setLoading(false); // Set loading to false if db is not available
      // setError("Firestore database instance is not available."); // Optionally set an error
      return;
    }

    const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
    const unsubscribe = onSnapshot(usersColRef,
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort users: admins first, then managers, then engineers/viewers alphabetically by name
        usersList.sort((a, b) => {
          const roleOrder = { 'Admin': 0, 'Manager': 1, 'Engineer': 2, 'Viewer': 3 };
          if (roleOrder[a.role] !== roleOrder[b.role]) {
            return roleOrder[a.role] - roleOrder[b.role];
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        setUsers(usersList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, currentUserId, appId]); // Added appId to dependency array as it's used in collection path

  return { users, loading, error };
};

export { useUsers };
