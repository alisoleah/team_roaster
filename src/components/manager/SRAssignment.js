import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { appId } from '../../../config/firebase.js';
import { Modal } from '../../Modal.js';

// SR Assignment Component (Manager Only)
function SRAssignment({ myTeam, db }) {
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [isForceAssign, setIsForceAssign] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null); // Function to execute on confirm

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

    if (!isForceAssign && (engineer.currentSrCount || 0) >= (engineer.srThreshold || 0)) {
      setModalMessage(`Engineer ${engineer.name} has reached their SR threshold (${engineer.srThreshold || 0}). Do you want to force assign?`);
      setModalAction(() => () => confirmAssignSR(engineer, true));
      setIsModalOpen(true);
      return;
    }
    confirmAssignSR(engineer, isForceAssign);
  };

  const confirmAssignSR = async (engineer, force) => {
    try {
      const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
      const newSrCount = (engineer.currentSrCount || 0) + 1;
      await updateDoc(engineerDocRef, { currentSrCount: newSrCount });
      setMessage(`SR assigned to ${engineer.name}. New count: ${newSrCount}.`);
      setSelectedEngineerId('');
      setIsForceAssign(false); // Reset force assign checkbox
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error assigning SR:", error);
      setMessage(`Error assigning SR: ${error.message}`);
    }
    setIsModalOpen(false); // Close modal if it was open
  };

  const handleResetSR = (engineer) => {
    setModalMessage(`Are you sure you want to reset SR count for ${engineer.name} to 0?`);
    setModalAction(() => () => confirmResetSR(engineer));
    setIsModalOpen(true);
  };

  const confirmResetSR = async (engineer) => {
    try {
      const engineerDocRef = doc(db, `artifacts/${appId}/public/data/users`, engineer.id);
      await updateDoc(engineerDocRef, { currentSrCount: 0 });
      setMessage(`SR count for ${engineer.name} reset to 0.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error resetting SR count:", error);
      setMessage(`Error resetting SR count: ${error.message}`);
    }
    setIsModalOpen(false);
  };

  if (!myTeam || myTeam.length === 0) {
    return <p className="text-gray-600 p-4">You currently have no engineers assigned to your team to assign SRs.</p>;
  }

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
          disabled={!selectedEngineerId}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md disabled:opacity-50"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirmation">
        <p className="text-gray-700 mb-6">{modalMessage}</p>
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
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
}

export { SRAssignment };
