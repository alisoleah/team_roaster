import React, { useState } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { appId } from '../../../config/firebase.js'; // Path is ../../../ from src/components/admin to root then src/config
import { Modal } from '../../Modal.js'; // Path is ../../ from src/components/admin to src/components

// --- Skill Management Component (Admin Only) ---
function SkillManagement({ skills, db }) {
  const [newSkillName, setNewSkillName] = useState('');
  const [editingSkill, setEditingSkill] = useState(null); // Skill object if editing
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [message, setMessage] = useState('');

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

  const handleEditClick = (skill) => {
    setEditingSkill(skill);
    setNewSkillName(skill.name);
  };

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

  const handleDeleteClick = (skill) => {
    setSkillToDelete(skill);
    setIsDeleteModalOpen(true);
  };

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
        setIsDeleteModalOpen(false); // Close modal on error too
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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSkillToDelete(null); }}
        title="Confirm Deletion"
      >
        <p className="text-gray-700 mb-6">{`Are you sure you want to delete skill "${skillToDelete?.name}"? This will remove it from all users.`}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => { setIsDeleteModalOpen(false); setSkillToDelete(null); }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteSkill}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out shadow-md"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

export { SkillManagement };
