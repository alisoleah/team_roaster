import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { appId } from '../../config/firebase.js';
import { Modal } from '../components/Modal.js';

// --- Engineer/Individual View Components ---
function EngineerView({ currentUser, users, skills, db }) { // users and skills might not be directly needed by EngineerView itself but passed down by App
  const [newVacationDate, setNewVacationDate] = useState('');
  const [message, setMessage] = useState(''); // For general messages/feedback
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);

  const myManager = currentUser.managerId ? users.find(u => u.id === currentUser.managerId) : null;

  const handleAddVacationRequest = async () => {
    if (!newVacationDate) {
      setMessage('Please select a date for your vacation request.');
      return;
    }

    if ((currentUser.vacationDates || []).includes(newVacationDate)) {
      setModalMessage(`You already have vacation on ${newVacationDate}.`);
      setModalAction(null); // No action, just info
      setIsModalOpen(true);
      return;
    }

    setModalMessage(`Request vacation on ${newVacationDate}?`);
    setModalAction(() => () => confirmAddVacationRequest(newVacationDate));
    setIsModalOpen(true);
  };

  const confirmAddVacationRequest = async (dateToAdd) => {
    try {
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.id);
      const updatedVacations = [...(currentUser.vacationDates || []), dateToAdd].sort();
      await updateDoc(userDocRef, { vacationDates: updatedVacations });
      setNewVacationDate('');
      setMessage('Vacation request submitted successfully!'); // General feedback
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error submitting vacation request:", error);
      setMessage(`Error submitting vacation request: ${error.message}`); // General feedback
    }
    setIsModalOpen(false); // Close modal after action
  };

  const handleRemoveVacationRequest = (dateToRemove) => {
    setModalMessage(`Remove your vacation on ${dateToRemove}?`);
    setModalAction(() => () => confirmRemoveVacationRequest(dateToRemove));
    setIsModalOpen(true);
  };

  const confirmRemoveVacationRequest = async (dateToRemove) => {
    try {
      const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUser.id);
      const updatedVacations = (currentUser.vacationDates || []).filter(date => date !== dateToRemove);
      await updateDoc(userDocRef, { vacationDates: updatedVacations });
      setMessage('Vacation removed successfully!'); // General feedback
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error removing vacation request:", error);
      setMessage(`Error removing vacation request: ${error.message}`); // General feedback
    }
    setIsModalOpen(false); // Close modal after action
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
                disabled={!newVacationDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md disabled:opacity-50"
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
                    className="ml-4 text-red-500 hover:text-red-700 focus:outline-none p-1 rounded-full hover:bg-red-100"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalAction ? "Confirmation" : "Information"}>
        <p className="text-gray-700 mb-6">{modalMessage}</p>
        <div className="flex justify-end space-x-3 mt-4">
          {modalAction && ( // Only show Cancel if there's an action to confirm
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              if (modalAction) modalAction();
              setIsModalOpen(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
          >
            {modalAction ? "Confirm" : "OK"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default EngineerView;
