import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { appId } from '../../../config/firebase.js';
import { Modal } from '../../Modal.js';

// Manager's Vacation Management Component
function ManagerVacationManagement({ myTeam, db }) {
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [newVacationDate, setNewVacationDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);

  const handleAddVacation = async () => {
    if (!selectedEngineerId || !newVacationDate) {
      setModalMessage('Please select an engineer and a date.');
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }

    const engineer = myTeam.find(e => e.id === selectedEngineerId);
    if (!engineer) return; // Should not happen if selectedEngineerId is from myTeam

    if ((engineer.vacationDates || []).includes(newVacationDate)) {
      setModalMessage(`Engineer ${engineer.name} already has vacation on ${newVacationDate}.`);
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }

    setModalMessage(`Add vacation for ${engineer.name} on ${newVacationDate}?`);
    setModalAction(() => () => confirmAddVacation(engineer, newVacationDate));
    setIsModalOpen(true);
  };

  const confirmAddVacation = async (engineer, dateToAdd) => {
    try {
      const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
      const updatedVacations = [...(engineer.vacationDates || []), dateToAdd].sort();
      await updateDoc(engineerDocRef, { vacationDates: updatedVacations });
      setNewVacationDate(''); // Clear input after successful add
      // UI will update via onSnapshot from useUsers hook in parent
    } catch (error) {
      console.error("Error adding vacation:", error);
      // Display error in modal or as a toast message if available
      setModalMessage(`Error adding vacation: ${error.message}`);
      setModalAction(null); // Clear action if it fails
      setIsModalOpen(true); // Re-open modal to show error (or use a different error display mechanism)
      return; // Prevent closing modal immediately if error is shown in same modal
    }
    setIsModalOpen(false); // Close confirmation modal on success
  };

  const handleRemoveVacation = (engineer, dateToRemove) => {
    setModalMessage(`Remove vacation for ${engineer.name} on ${dateToRemove}?`);
    setModalAction(() => () => confirmRemoveVacation(engineer, dateToRemove));
    setIsModalOpen(true);
  };

  const confirmRemoveVacation = async (engineer, dateToRemove) => {
    try {
      const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
      const updatedVacations = (engineer.vacationDates || []).filter(date => date !== dateToRemove);
      await updateDoc(engineerDocRef, { vacationDates: updatedVacations });
      // UI will update via onSnapshot
    } catch (error) {
      console.error("Error removing vacation:", error);
      setModalMessage(`Error removing vacation: ${error.message}`);
      setModalAction(null);
      setIsModalOpen(true);
      return;
    }
    setIsModalOpen(false);
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
              disabled={!newVacationDate}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 ease-in-out shadow-md disabled:opacity-50"
            >
              Add Vacation
            </button>
          </div>
        )}
      </div>

      <h4 className="text-xl font-semibold mb-3 text-gray-800">Current Team Vacations</h4>
      {myTeam.length === 0 ? (
        <p className="text-gray-600">No engineers in your team to display vacations for.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vacation Dates</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {myTeam.map(engineer => (
                <tr key={engineer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{engineer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(engineer.vacationDates || []).length > 0 ? (
                      <ul className="space-y-1">
                        {engineer.vacationDates.map((date, idx) => (
                          <li key={idx} className="flex items-center justify-between">
                            <span>{date}</span>
                            <button
                              onClick={() => handleRemoveVacation(engineer, date)}
                              className="ml-2 text-red-500 hover:text-red-700 focus:outline-none p-1 rounded-full hover:bg-red-100"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirm Action">
        <p className="text-gray-700 mb-6">{modalMessage}</p>
        {modalAction && ( // Only show buttons if there's an action to confirm
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (modalAction) modalAction();
                // setIsModalOpen(false); // Action itself should close on success/failure or re-set message
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
            >
              Confirm
            </button>
          </div>
        )}
         {!modalAction && ( // For simple message display like "Select engineer and date"
             <div className="flex justify-end mt-4">
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
                >
                    OK
                </button>
            </div>
         )}
      </Modal>
    </div>
  );
}

export { ManagerVacationManagement };
