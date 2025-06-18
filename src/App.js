import React from 'react';
import { useFirebase } from './hooks/useFirebase.js';
import { useUsers } from './hooks/useUsers.js';
import { useSkills } from './hooks/useSkills.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
// import { signOut } from 'firebase/auth'; // Not directly used in App, but in auth context/config
import AdminView from './views/AdminView.js';

// Placeholder components (actual views will be moved/created in later steps)
// For current AdminView relocation task, this AdminView placeholder will be replaced by an import.
// const AdminView = ({ currentUser, users, skills, db }) => <div>Admin View Placeholder: {currentUser.name}</div>; // Original placeholder removed
import ManagerView from './views/ManagerView.js';
// const ManagerView = ({ currentUser, users, skills, db }) => <div>Manager View Placeholder: {currentUser.name}</div>; // Original placeholder removed
import EngineerView from './views/EngineerView.js';
// const EngineerView = ({ currentUser, users, skills, db }) => <div>Engineer View Placeholder: {currentUser.name}</div>; // Original placeholder removed
const ViewerView = ({ currentUser, users, skills, db }) => <div>Viewer View Placeholder: {currentUser.name}</div>;

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
            {auth && (
              <button
                onClick={() => auth.signOut()} // signOut is a method on the auth instance
                className="mt-6 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
              >
                Sign Out (if signed in anonymously)
              </button>
            )}
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
              {auth && (
                <button
                  onClick={() => auth.signOut()} // signOut is a method on the auth instance
                  className="mt-6 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-900">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-3xl font-bold">Team Roster</h1>
        {currentUser && auth && (
          <div className="flex items-center space-x-4">
            <span className="text-lg">Welcome, {currentUser.name} ({currentUser.role})</span>
            <button
              onClick={() => auth.signOut()} // signOut is a method on the auth instance
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

export default App;
