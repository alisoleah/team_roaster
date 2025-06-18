import React, { useState } from 'react';
import { doc, updateDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { appId } from '../../../config/firebase.js'; // Path is ../../../ from src/components/admin to root then src/config
import { Modal } from '../../Modal.js'; // Path is ../../ from src/components/admin to src/components
import { AddEditUserModal } from './AddEditUserModal.js';

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
        // Add new user
        // For a real app with auth, this would be more complex, potentially creating an auth user first.
        // Here, we're just adding a document to the users collection. Firestore will generate an ID.
        const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
        // We need to ensure the userData doesn't accidentally include an 'id' field if it's a new user.
        const { id, ...dataWithoutId } = userData; // Make sure no 'id' is passed for addDoc
        await addDoc(usersColRef, dataWithoutId);
        setMessage('User added successfully!');
      }
      setShowAddEditModal(false);
      setEditingUser(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error saving user:", error);
      setMessage(`Error saving user: ${error.message}`);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setShowAddEditModal(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

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

      {/* Add/Edit User Modal using the new structure */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => { setShowAddEditModal(false); setEditingUser(null); }}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <AddEditUserModal
          onSave={handleSaveUser}
          onClose={() => { setShowAddEditModal(false); setEditingUser(null); }}
          user={editingUser}
          managers={managers}
          availableSkills={availableSkills}
        />
      </Modal>

      {/* Delete Confirmation Modal (uses the generic Modal directly) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
        title="Confirm Deletion"
      >
        <p className="text-gray-700 mb-6">{`Are you sure you want to delete user "${userToDelete?.name}"? This action cannot be undone.`}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteUser}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

export { UserManagement };
