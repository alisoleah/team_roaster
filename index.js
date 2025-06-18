import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// --- Global Variable Declarations (Canvas provided) ---
// These variables are provided by the Canvas environment.
// We add fallbacks for local development if these are undefined.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Context ---
// Provides Firebase instances (db, auth) and user information throughout the app.
const FirebaseContext = createContext(null);

// --- Firebase Provider Component ---
// Initializes Firebase and handles authentication.
function FirebaseProvider({ children }) {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if auth state has been checked

  useEffect(() => {
    async function initializeFirebase() {
      try {
        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

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
              // For this app, we'll assign a 'Viewer' role by default or prompt admin to assign a role.
              // For simplicity, we'll create a basic user document if it doesn't exist.
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
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          // If no custom token, sign in anonymously
          await signInAnonymously(firebaseAuth);
        }

        return () => unsubscribe(); // Cleanup auth observer on unmount

      } catch (error) {
        console.error("Error initializing Firebase or signing in:", error);
        setIsAuthReady(true); // Still set ready to avoid infinite loading, but with an error
      }
    }

    initializeFirebase();
  }, []); // Run once on component mount

  // Provide the Firebase instances and current user to children components
  return (
    <FirebaseContext.Provider value={{ db, auth, currentUser, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
}

// --- Custom Hook for Firebase Context ---
// Simplifies accessing Firebase services and user data.
function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

// --- Shared Components ---

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500"></div>
    <p className="ml-4 text-lg text-gray-700">Loading application...</p>
  </div>
);

// Custom Modal Component (for alerts/confirmations)
const Modal = ({ isOpen, title, message, onConfirm, onCancel, showCancel = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border-t-4 border-blue-500 animate-fade-in-down">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Data Fetching and Mutation Hooks ---

// Hook to manage all users
const useUsers = (db, currentUserId) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) return;

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
  }, [db, currentUserId]); // Depend on db and currentUserId to re-run if auth state changes

  return { users, loading, error };
};

// Hook to manage all skills
const useSkills = (db) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) return;

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
  }, [db]);

  return { skills, loading, error };
};

// --- Main Application Layout and Routing ---
function App() {
  const { db, auth, currentUser, isAuthReady } = useFirebase();
  const { users, loading: usersLoading, error: usersError } = useUsers(db, currentUser?.id);
  const { skills, loading: skillsLoading, error: skillsError } = useSkills(db);

  // Show loading spinner until authentication and initial data are ready
  if (!isAuthReady || usersLoading || skillsLoading) {
    return <LoadingSpinner />;
  }

  if (usersError || skillsError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-800 p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Error Loading Application</h2>
        <p className="text-center">{usersError || skillsError}</p>
        <p className="mt-4 text-sm text-gray-600">Please try refreshing the page.</p>
      </div>
    );
  }

  // Determine which view to render based on user role
  const renderView = () => {
    if (!currentUser) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Team Roster</h2>
            <p className="text-gray-600 mb-6">You are not signed in or your user profile is not yet configured by an Admin.</p>
            <p className="text-gray-600 mb-6">
              If this is your first time, an administrator needs to add your user profile.
            </p>
            <p className="text-sm text-gray-500">
              Your User ID: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{auth?.currentUser?.uid || 'N/A'}</span>
            </p>
            <button
              onClick={() => auth.signOut()}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
            >
              Sign Out (if signed in anonymously)
            </button>
          </div>
        </div>
      );
    }

    switch (currentUser.role) {
      case 'Admin':
        return <AdminView currentUser={currentUser} users={users} skills={skills} db={db} />;
      case 'Manager':
        return <ManagerView currentUser={currentUser} users={users} skills={skills} db={db} />;
      case 'Engineer':
        return <EngineerView currentUser={currentUser} users={users} skills={skills} db={db} />;
      case 'Viewer':
        return <ViewerView currentUser={currentUser} users={users} skills={skills} db={db} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
              <p className="text-gray-600 mb-6">Your role is not recognized or not yet assigned. Please contact an administrator.</p>
              <p className="text-sm text-gray-500">
                Your User ID: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{currentUser.id || 'N/A'}</span>
              </p>
              <button
                onClick={() => auth.signOut()}
                className="mt-6 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-3xl font-bold">Team Roster</h1>
        {currentUser && (
          <div className="flex items-center space-x-4">
            <span className="text-lg">Welcome, {currentUser.name} ({currentUser.role})</span>
            <button
              onClick={() => auth.signOut()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-md transition duration-200 ease-in-out shadow-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>
      <main className="p-6">
        {renderView()}
      </main>
    </div>
  );
}

// --- Admin View Components ---

function AdminView({ currentUser, users, skills, db }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'skills' or 'roster'

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h2>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'skills' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Skill Management
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'roster' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Overall Roster View
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagement users={users} skills={skills} db={db} />}
        {activeTab === 'skills' && <SkillManagement skills={skills} db={db} />}
        {activeTab === 'roster' && <OverallRosterView users={users} skills={skills} />}
      </div>
    </div>
  );
}

// --- User Management Component (Admin Only) ---
function UserManagement({ users, skills, db }) {
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // User object if editing, null if adding
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [message, setMessage] = useState(''); // For success/error messages

  const managers = users.filter(u => u.role === 'Manager');
  const availableSkills = skills.map(s => ({ value: s.id, label: s.name }));

  // Handles adding or updating a user in Firestore
  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        // Update existing user
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, editingUser.id);
        await updateDoc(userDocRef, userData);
        setMessage('User updated successfully!');
      } else {
        // Add new user (Firestore will generate ID)
        // Note: For a real app, email should be unique and ideally linked to Firebase Auth user.
        // Here, we're just adding a document to the users collection.
        const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
        await addDoc(usersColRef, userData); // This will generate a new UID for the Firestore document.
        setMessage('User added successfully!');
      }
      setShowAddEditModal(false);
      setEditingUser(null);
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } catch (error) {
      console.error("Error saving user:", error);
      setMessage(`Error saving user: ${error.message}`);
    }
  };

  // Prepares the modal for editing an existing user
  const handleEditClick = (user) => {
    setEditingUser(user);
    setShowAddEditModal(true);
  };

  // Opens the delete confirmation modal
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Deletes a user from Firestore
  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, userToDelete.id);
        await deleteDoc(userDocRef);
        setMessage('User deleted successfully!');
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Error deleting user:", error);
        setMessage(`Error deleting user: ${error.message}`);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">Manage Users</h3>
      <button
        onClick={() => { setEditingUser(null); setShowAddEditModal(true); }}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
      >
        Add New User
      </button>

      {message && (
        <div className={`p-3 mb-4 rounded-md text-white ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}>
          {message}
        </div>
      )}

      {/* User Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SR Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.managerId ? users.find(m => m.id === user.managerId)?.name || 'N/A' : 'None'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {(user.skills || []).map(skillId => skills.find(s => s.id === skillId)?.name).filter(Boolean).join(', ') || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.srThreshold || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3 transition duration-200 ease-in-out"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    className="text-red-600 hover:text-red-900 transition duration-200 ease-in-out"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      <AddEditUserModal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        onSave={handleSaveUser}
        user={editingUser}
        managers={managers}
        availableSkills={availableSkills}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete user "${userToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDeleteUser}
        onCancel={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
      />
    </div>
  );
}

// --- Add/Edit User Modal Component ---
function AddEditUserModal({ isOpen, onClose, onSave, user, managers, availableSkills }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Engineer', // Default role for new users
    managerId: '',
    workingHours: '',
    shiftPattern: '',
    vacationDates: [],
    skills: [],
    srThreshold: 0,
    currentSrCount: 0,
  });

  useEffect(() => {
    // Populate form data when editing an existing user
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Engineer',
        managerId: user.managerId || '',
        workingHours: user.workingHours || '',
        shiftPattern: user.shiftPattern || '',
        vacationDates: user.vacationDates || [],
        skills: user.skills || [],
        srThreshold: user.srThreshold || 0,
        currentSrCount: user.currentSrCount || 0,
      });
    } else {
      // Reset form for adding a new user
      setFormData({
        name: '',
        email: '',
        role: 'Engineer',
        managerId: '',
        workingHours: '',
        shiftPattern: '',
        vacationDates: [],
        skills: [],
        srThreshold: 0,
        currentSrCount: 0,
      });
    }
  }, [user]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle multi-select for skills
  const handleSkillsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData(prev => ({ ...prev, skills: selectedOptions }));
  };

  // Handle adding vacation date (simple string input)
  const handleAddVacationDate = (e) => {
    e.preventDefault();
    const dateInput = document.getElementById('newVacationDate'); // Get input by ID
    const newDate = dateInput.value;
    if (newDate && !formData.vacationDates.includes(newDate)) {
      setFormData(prev => ({
        ...prev,
        vacationDates: [...prev.vacationDates, newDate].sort() // Keep sorted
      }));
      dateInput.value = ''; // Clear input
    }
  };

  // Handle removing vacation date
  const handleRemoveVacationDate = (dateToRemove) => {
    setFormData(prev => ({
      ...prev,
      vacationDates: prev.vacationDates.filter(date => date !== dateToRemove)
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={user ? 'Edit User' : 'Add New User'}
      showCancel={true}
      onConfirm={handleSubmit} // Using onConfirm for form submission
      onCancel={onClose}
      message="" // Message is part of the form
    >
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Engineer">Engineer</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
        {(formData.role === 'Engineer' || formData.role === 'Viewer') && (
          <div>
            <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">Manager</label>
            <select
              id="managerId"
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Manager (Optional)</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>{manager.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="workingHours" className="block text-sm font-medium text-gray-700">Working Hours (e.g., 9 AM - 5 PM)</label>
          <input
            type="text"
            id="workingHours"
            name="workingHours"
            value={formData.workingHours}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="shiftPattern" className="block text-sm font-medium text-gray-700">Shift Pattern (e.g., Day Shift, Rotational)</label>
          <input
            type="text"
            id="shiftPattern"
            name="shiftPattern"
            value={formData.shiftPattern}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
          <select
            id="skills"
            name="skills"
            multiple
            value={formData.skills}
            onChange={handleSkillsChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 h-24"
          >
            {availableSkills.map(skill => (
              <option key={skill.value} value={skill.value}>{skill.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple skills.</p>
        </div>
        {formData.role === 'Engineer' && (
          <div>
            <label htmlFor="srThreshold" className="block text-sm font-medium text-gray-700">SR Threshold</label>
            <input
              type="number"
              id="srThreshold"
              name="srThreshold"
              value={formData.srThreshold}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
        <div>
          <label htmlFor="vacationDates" className="block text-sm font-medium text-gray-700 mb-2">Vacation Dates</label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="date"
              id="newVacationDate" // Assign an ID to the input
              className="border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddVacationDate}
              className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200 ease-in-out shadow-sm text-sm"
            >
              Add Date
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.vacationDates.map(date => (
              <span key={date} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {date}
                <button
                  type="button"
                  onClick={() => handleRemoveVacationDate(date)}
                  className="ml-1 -mr-0.5 h-4 w-4 flex-shrink-0 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                >
                  <span className="sr-only">Remove date</span>
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
          >
            {user ? 'Update User' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Skill Management Component (Admin Only) ---
function SkillManagement({ skills, db }) {
  const [newSkillName, setNewSkillName] = useState('');
  const [editingSkill, setEditingSkill] = useState(null); // Skill object if editing
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [message, setMessage] = useState('');

  // Adds a new skill to Firestore
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (newSkillName.trim() === '') {
      setMessage('Skill name cannot be empty.');
      return;
    }
    try {
      const skillsColRef = collection(db, `artifacts/${appId}/public/data/skills`);
      await addDoc(skillsColRef, { name: newSkillName.trim() });
      setNewSkillName('');
      setMessage('Skill added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error adding skill:", error);
      setMessage(`Error adding skill: ${error.message}`);
    }
  };

  // Prepares the form for editing a skill
  const handleEditClick = (skill) => {
    setEditingSkill(skill);
    setNewSkillName(skill.name);
  };

  // Updates an existing skill in Firestore
  const handleUpdateSkill = async (e) => {
    e.preventDefault();
    if (!editingSkill || newSkillName.trim() === '') {
      setMessage('Skill name cannot be empty.');
      return;
    }
    try {
      const skillDocRef = doc(db, `artifacts/${appId}/public/data/skills`, editingSkill.id);
      await updateDoc(skillDocRef, { name: newSkillName.trim() });
      setEditingSkill(null);
      setNewSkillName('');
      setMessage('Skill updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error updating skill:", error);
      setMessage(`Error updating skill: ${error.message}`);
    }
  };

  // Opens the delete confirmation modal for a skill
  const handleDeleteClick = (skill) => {
    setSkillToDelete(skill);
    setIsDeleteModalOpen(true);
  };

  // Deletes a skill from Firestore
  const confirmDeleteSkill = async () => {
    if (skillToDelete) {
      try {
        const skillDocRef = doc(db, `artifacts/${appId}/public/data/skills`, skillToDelete.id);
        await deleteDoc(skillDocRef);
        setMessage('Skill deleted successfully!');
        setIsDeleteModalOpen(false);
        setSkillToDelete(null);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Error deleting skill:", error);
        setMessage(`Error deleting skill: ${error.message}`);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">Manage Skills</h3>

      {message && (
        <div className={`p-3 mb-4 rounded-md text-white ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}>
          {message}
        </div>
      )}

      {/* Add/Edit Skill Form */}
      <form onSubmit={editingSkill ? handleUpdateSkill : handleAddSkill} className="mb-6 flex space-x-3">
        <input
          type="text"
          placeholder="New Skill Name"
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          className="flex-grow border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
        >
          {editingSkill ? 'Update Skill' : 'Add Skill'}
        </button>
        {editingSkill && (
          <button
            type="button"
            onClick={() => { setEditingSkill(null); setNewSkillName(''); }}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
          >
            Cancel Edit
          </button>
        )}
      </form>

      {/* Skills Table */}
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {skills.map(skill => (
              <tr key={skill.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{skill.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditClick(skill)}
                    className="text-blue-600 hover:text-blue-900 mr-3 transition duration-200 ease-in-out"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(skill)}
                    className="text-red-600 hover:text-red-900 transition duration-200 ease-in-out"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal for Skills */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete skill "${skillToDelete?.name}"? This will remove it from all users.`}
        onConfirm={confirmDeleteSkill}
        onCancel={() => { setIsDeleteModalOpen(false); setSkillToDelete(null); }}
      />
    </div>
  );
}

// --- Overall Roster View (Admin & Viewer) ---
function OverallRosterView({ users, skills }) {
  // Group users by manager
  const managers = users.filter(u => u.role === 'Manager');
  const engineersAndViewers = users.filter(u => u.role === 'Engineer' || u.role === 'Viewer');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-6 text-gray-800">Overall Team Roster</h3>

      {managers.length === 0 && engineersAndViewers.length === 0 ? (
        <p className="text-gray-600">No users configured yet. Please add users in User Management.</p>
      ) : (
        <div className="space-y-8">
          {managers.map(manager => (
            <div key={manager.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50 shadow-sm">
              <h4 className="text-xl font-bold text-blue-700 mb-4">{manager.name} (Manager)</h4>
              <p className="text-sm text-gray-600 mb-3">Email: {manager.email}</p>
              <h5 className="text-lg font-semibold text-gray-700 mb-3">Team Members:</h5>
              <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Working Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Shift</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Skills</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">SRs (Current/Threshold)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Vacations</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {engineersAndViewers
                      .filter(u => u.managerId === manager.id)
                      .map(user => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.workingHours || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.shiftPattern || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(user.skills || []).map(skillId => skills.find(s => s.id === skillId)?.name).filter(Boolean).join(', ') || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.role === 'Engineer' ? `${user.currentSrCount || 0} / ${user.srThreshold || 0}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(user.vacationDates || []).length > 0 ? (
                              <ul className="list-disc list-inside">
                                {user.vacationDates.map((date, idx) => (
                                  <li key={idx}>{date}</li>
                                ))}
                              </ul>
                            ) : 'None'}
                          </td>
                        </tr>
                      ))}
                    {engineersAndViewers.filter(u => u.managerId === manager.id).length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">No team members assigned to this manager yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Users without a manager (Admins, Managers not listed above, or unassigned Engineers/Viewers) */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50 shadow-sm">
            <h4 className="text-xl font-bold text-gray-700 mb-4">Other Users (Admins, Unassigned)</h4>
            <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Shift</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Skills</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">SRs (Current/Threshold)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Vacations</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users
                    .filter(u => u.role === 'Admin' || (u.role !== 'Manager' && !u.managerId)) // Admins or engineers/viewers without manager
                    .map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.workingHours || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.shiftPattern || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {(user.skills || []).map(skillId => skills.find(s => s.id === skillId)?.name).filter(Boolean).join(', ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.role === 'Engineer' ? `${user.currentSrCount || 0} / ${user.srThreshold || 0}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {(user.vacationDates || []).length > 0 ? (
                            <ul className="list-disc list-inside">
                              {user.vacationDates.map((date, idx) => (
                                <li key={idx}>{date}</li>
                              ))}
                            </ul>
                          ) : 'None'}
                        </td>
                      </tr>
                    ))}
                  {users.filter(u => u.role === 'Admin' || (u.role !== 'Manager' && !u.managerId)).length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">No other unassigned users.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Manager View Components ---
function ManagerView({ currentUser, users, skills, db }) {
  const [activeTab, setActiveTab] = useState('team-roster'); // 'team-roster' or 'sr-management' or 'vacation-management'
  const myTeam = users.filter(u => u.managerId === currentUser.id && u.role === 'Engineer');

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Manager Dashboard</h2>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('team-roster')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'team-roster' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            My Team Roster
          </button>
          <button
            onClick={() => setActiveTab('sr-management')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'sr-management' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            SR Assignment
          </button>
          <button
            onClick={() => setActiveTab('vacation-management')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-200 ease-in-out
              ${activeTab === 'vacation-management' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Manage Team Vacations
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {myTeam.length === 0 && activeTab !== 'vacation-management' ? (
          <p className="text-gray-600">You currently have no engineers assigned to your team.</p>
        ) : (
          <>
            {activeTab === 'team-roster' && <ManagerTeamRoster myTeam={myTeam} skills={skills} />}
            {activeTab === 'sr-management' && <SRAssignment myTeam={myTeam} db={db} />}
            {activeTab === 'vacation-management' && <ManagerVacationManagement myTeam={myTeam} db={db} />}
          </>
        )}
      </div>
    </div>
  );
}

// Manager's Team Roster Display
function ManagerTeamRoster({ myTeam, skills }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">My Team Roster</h3>
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Pattern</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SRs (Current/Threshold)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vacations</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {myTeam.map(engineer => (
              <tr key={engineer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{engineer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{engineer.workingHours || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{engineer.shiftPattern || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {(engineer.skills || []).map(skillId => skills.find(s => s.id === skillId)?.name).filter(Boolean).join(', ') || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {`${engineer.currentSrCount || 0} / ${engineer.srThreshold || 0}`}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {(engineer.vacationDates || []).length > 0 ? (
                    <ul className="list-disc list-inside">
                      {engineer.vacationDates.map((date, idx) => (
                        <li key={idx}>{date}</li>
                      ))}
                    </ul>
                  ) : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// SR Assignment Component (Manager Only)
function SRAssignment({ myTeam, db }) {
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [isForceAssign, setIsForceAssign] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null); // Function to execute on confirm

  // Handles assigning an SR to an engineer
  const handleAssignSR = async () => {
    if (!selectedEngineerId) {
      setMessage('Please select an engineer.');
      return;
    }

    const engineer = myTeam.find(e => e.id === selectedEngineerId);
    if (!engineer) {
      setMessage('Selected engineer not found.');
      return;
    }

    // Check threshold
    if (!isForceAssign && engineer.currentSrCount >= engineer.srThreshold) {
      setModalMessage(`Engineer ${engineer.name} has reached their SR threshold (${engineer.srThreshold}). Do you want to force assign?`);
      setModalAction(() => () => confirmAssignSR(engineer, true)); // Set action for force assign
      setIsModalOpen(true);
      return;
    }

    // Proceed with assignment
    confirmAssignSR(engineer, isForceAssign);
  };

  // Confirms and executes the SR assignment
  const confirmAssignSR = async (engineer, force) => {
    setIsModalOpen(false); // Close modal if open

    try {
      const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
      const newSrCount = (engineer.currentSrCount || 0) + 1;
      await updateDoc(engineerDocRef, { currentSrCount: newSrCount });
      setMessage(`SR assigned to ${engineer.name}. New count: ${newSrCount}.`);
      setSelectedEngineerId('');
      setIsForceAssign(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error assigning SR:", error);
      setMessage(`Error assigning SR: ${error.message}`);
    }
  };

  // Handles resetting SR count for an engineer
  const handleResetSR = async (engineer) => {
    setModalMessage(`Are you sure you want to reset SR count for ${engineer.name} to 0?`);
    setModalAction(() => async () => {
      setIsModalOpen(false);
      try {
        const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
        await updateDoc(engineerDocRef, { currentSrCount: 0 });
        setMessage(`SR count for ${engineer.name} reset to 0.`);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Error resetting SR count:", error);
        setMessage(`Error resetting SR count: ${error.message}`);
      }
    });
    setIsModalOpen(true);
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">Assign Service Requests</h3>

      {message && (
        <div className={`p-3 mb-4 rounded-md text-white ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-col space-y-4 mb-6">
        <div>
          <label htmlFor="engineerSelect" className="block text-sm font-medium text-gray-700">Select Engineer</label>
          <select
            id="engineerSelect"
            value={selectedEngineerId}
            onChange={(e) => setSelectedEngineerId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select an Engineer --</option>
            {myTeam.map(engineer => (
              <option key={engineer.id} value={engineer.id}>{engineer.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="forceAssign"
            checked={isForceAssign}
            onChange={(e) => setIsForceAssign(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="forceAssign" className="ml-2 block text-sm text-gray-900">
            Force Assign (Override threshold)
          </label>
        </div>
        <button
          onClick={handleAssignSR}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
        >
          Assign SR
        </button>
      </div>

      <h4 className="text-xl font-semibold mb-3 text-gray-800">Team SR Status</h4>
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current SRs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SR Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {myTeam.map(engineer => (
              <tr key={engineer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{engineer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{engineer.currentSrCount || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{engineer.srThreshold || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleResetSR(engineer)}
                    className="text-orange-600 hover:text-orange-900 transition duration-200 ease-in-out"
                  >
                    Reset SR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for SR Assignment/Reset */}
      <Modal
        isOpen={isModalOpen}
        title="Confirmation"
        message={modalMessage}
        onConfirm={() => modalAction && modalAction()}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}

// Manager's Vacation Management Component
function ManagerVacationManagement({ myTeam, db }) {
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [newVacationDate, setNewVacationDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [engineerToModify, setEngineerToModify] = useState(null); // Engineer whose vacation is being modified

  const currentEngineer = myTeam.find(e => e.id === selectedEngineerId);

  // Handles adding a vacation date for a team member
  const handleAddVacation = async () => {
    if (!selectedEngineerId || !newVacationDate) {
      setModalMessage('Please select an engineer and a date.');
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }

    const engineer = myTeam.find(e => e.id === selectedEngineerId);
    if (!engineer) return;

    if ((engineer.vacationDates || []).includes(newVacationDate)) {
      setModalMessage(`Engineer ${engineer.name} already has vacation on ${newVacationDate}.`);
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }

    setModalMessage(`Add vacation for ${engineer.name} on ${newVacationDate}?`);
    setModalAction(() => async () => {
      setIsModalOpen(false);
      try {
        const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
        const updatedVacations = [...(engineer.vacationDates || []), newVacationDate].sort();
        await updateDoc(engineerDocRef, { vacationDates: updatedVacations });
        setNewVacationDate('');
        // No message needed here, UI updates automatically via onSnapshot
      } catch (error) {
        console.error("Error adding vacation:", error);
        setModalMessage(`Error adding vacation: ${error.message}`);
        setModalAction(null);
        setIsModalOpen(true);
      }
    });
    setIsModalOpen(true);
  };

  // Handles removing a vacation date for a team member
  const handleRemoveVacation = (engineer, dateToRemove) => {
    setEngineerToModify(engineer); // Store the engineer being modified
    setModalMessage(`Remove vacation for ${engineer.name} on ${dateToRemove}?`);
    setModalAction(() => async () => {
      setIsModalOpen(false);
      try {
        const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
        const updatedVacations = (engineer.vacationDates || []).filter(date => date !== dateToRemove);
        await updateDoc(engineerDocRef, { vacationDates: updatedVacations });
        // No message needed here, UI updates automatically via onSnapshot
      } catch (error) {
        console.error("Error removing vacation:", error);
        setModalMessage(`Error removing vacation: ${error.message}`);
        setModalAction(null);
        setIsModalOpen(true);
      }
    });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">Manage Team Vacations</h3>

      <div className="flex flex-col space-y-4 mb-6">
        <div>
          <label htmlFor="engineerVacationSelect" className="block text-sm font-medium text-gray-700">Select Engineer</label>
          <select
            id="engineerVacationSelect"
            value={selectedEngineerId}
            onChange={(e) => { setSelectedEngineerId(e.target.value); setNewVacationDate(''); }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select an Engineer --</option>
            {myTeam.map(engineer => (
              <option key={engineer.id} value={engineer.id}>{engineer.name}</option>
            ))}
          </select>
        </div>

        {selectedEngineerId && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={newVacationDate}
              onChange={(e) => setNewVacationDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddVacation}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 ease-in-out shadow-md"
            >
              Add Vacation
            </button>
          </div>
        )}
      </div>

      <h4 className="text-xl font-semibold mb-3 text-gray-800">Current Team Vacations</h4>
      <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vacation Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {myTeam.map(engineer => (
              <tr key={engineer.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{engineer.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {(engineer.vacationDates || []).length > 0 ? (
                    <ul className="list-disc list-inside">
                      {engineer.vacationDates.map((date, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span>{date}</span>
                          <button
                            onClick={() => handleRemoveVacation(engineer, date)}
                            className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                            title="Remove this vacation date"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : 'None'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {/* Actions for the row, if any, can be added here */}
                </td>
              </tr>
            ))}
            {myTeam.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No engineers in your team.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Confirm Action"
        message={modalMessage}
        onConfirm={() => modalAction && modalAction()}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}

// --- Engineer/Individual View Components ---
function EngineerView({ currentUser, users, skills, db }) {
  const [newVacationDate, setNewVacationDate] = useState('');
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);

  const myManager = currentUser.managerId ? users.find(u => u.id === currentUser.managerId) : null;

  // Handles adding a vacation request
  const handleAddVacationRequest = async () => {
    if (!newVacationDate) {
      setMessage('Please select a date for your vacation request.');
      return;
    }

    if ((currentUser.vacationDates || []).includes(newVacationDate)) {
      setModalMessage(`You already have vacation on ${newVacationDate}.`);
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }

    setModalMessage(`Request vacation on ${newVacationDate}?`);
    setModalAction(() => async () => {
      setIsModalOpen(false);
      try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.id);
        const updatedVacations = [...(currentUser.vacationDates || []), newVacationDate].sort();
        await updateDoc(userDocRef, { vacationDates: updatedVacations });
        setNewVacationDate('');
        setMessage('Vacation request submitted successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Error submitting vacation request:", error);
        setMessage(`Error submitting vacation request: ${error.message}`);
      }
    });
    setIsModalOpen(true);
  };

  // Handles removing a vacation request
  const handleRemoveVacationRequest = (dateToRemove) => {
    setModalMessage(`Remove your vacation on ${dateToRemove}?`);
    setModalAction(() => async () => {
      setIsModalOpen(false);
      try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.id);
        const updatedVacations = (currentUser.vacationDates || []).filter(date => date !== dateToRemove);
        await updateDoc(userDocRef, { vacationDates: updatedVacations });
        setMessage('Vacation removed successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Error removing vacation request:", error);
        setMessage(`Error removing vacation request: ${error.message}`);
      }
    });
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">My Dashboard</h2>

      {message && (
        <div className={`p-3 mb-4 rounded-md text-white ${message.includes('Error') ? 'bg-red-500' : 'bg-green-500'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">My Details</h3>
          <p><strong className="text-gray-700">Name:</strong> {currentUser.name}</p>
          <p><strong className="text-gray-700">Email:</strong> {currentUser.email}</p>
          <p><strong className="text-gray-700">Role:</strong> {currentUser.role}</p>
          <p><strong className="text-gray-700">Manager:</strong> {myManager?.name || 'None'}</p>
          <p><strong className="text-gray-700">Working Hours:</strong> {currentUser.workingHours || 'N/A'}</p>
          <p><strong className="text-gray-700">Shift Pattern:</strong> {currentUser.shiftPattern || 'N/A'}</p>
          {currentUser.role === 'Engineer' && (
            <p><strong className="text-gray-700">SRs:</strong> {currentUser.currentSrCount || 0} / {currentUser.srThreshold || 0}</p>
          )}
          <p className="mt-2"><strong className="text-gray-700">Skills:</strong></p>
          <div className="flex flex-wrap gap-2 mt-1">
            {(currentUser.skills || []).map(skillId => {
              const skill = skills.find(s => s.id === skillId);
              return skill ? (
                <span key={skill.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {skill.name}
                </span>
              ) : null;
            })}
            {(currentUser.skills || []).length === 0 && <span className="text-gray-500 text-sm">No skills assigned.</span>}
          </div>
        </div>

        {/* Vacation Management Card */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">My Vacations</h3>
          <div className="mb-4">
            <label htmlFor="newVacationDate" className="block text-sm font-medium text-gray-700">Request New Vacation Date</label>
            <div className="flex space-x-2 mt-1">
              <input
                type="date"
                id="newVacationDate"
                value={newVacationDate}
                onChange={(e) => setNewVacationDate(e.target.value)}
                className="flex-grow border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAddVacationRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
              >
                Request
              </button>
            </div>
          </div>

          <h4 className="text-lg font-semibold mb-2 text-gray-800">Upcoming Vacations:</h4>
          <ul className="space-y-2">
            {(currentUser.vacationDates || []).length > 0 ? (
              currentUser.vacationDates.map((date, idx) => (
                <li key={idx} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border border-gray-200">
                  <span className="text-gray-700">{date}</span>
                  <button
                    onClick={() => handleRemoveVacationRequest(date)}
                    className="ml-4 text-red-500 hover:text-red-700 focus:outline-none"
                    title="Remove this vacation request"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))
            ) : (
              <li className="text-gray-500 italic">No upcoming vacations planned.</li>
            )}
          </ul>
        </div>
      </div>
      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Confirmation"
        message={modalMessage}
        onConfirm={() => modalAction && modalAction()}
        onCancel={() => setIsModalOpen(false)}
      />
    </div>
  );
}

// --- Viewer View Component ---
function ViewerView({ users, skills }) {
  // Viewer view is essentially the same as the OverallRosterView from Admin.
  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Team Roster (Read-Only)</h2>
      <OverallRosterView users={users} skills={skills} />
    </div>
  );
}

// --- Root Component Wrapping the App with Firebase Provider ---
// This is the main component that Canvas will render.
export default function AppWrapper() {
  return (
    <FirebaseProvider>
      <App />
    </FirebaseProvider>
  );
}
