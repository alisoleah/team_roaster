import React, { useState } from 'react';
import ManagerTeamRoster from '../components/manager/ManagerTeamRoster.js'; // Default import
import { SRAssignment } from '../components/manager/SRAssignment.js';
import { ManagerVacationManagement } from '../components/manager/ManagerVacationManagement.js';

// --- Manager View Components ---
function ManagerView({ currentUser, users, skills, db }) {
  const [activeTab, setActiveTab] = useState('team-roster'); // 'team-roster' or 'sr-management' or 'vacation-management'

  // Filter users to get only engineers managed by the current user
  const myTeam = users.filter(u => u.managerId === currentUser.id && u.role === 'Engineer');

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Manager Dashboard</h2>

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

      <div>
        {activeTab === 'team-roster' && <ManagerTeamRoster myTeam={myTeam} skills={skills} />}
        {activeTab === 'sr-management' && <SRAssignment myTeam={myTeam} db={db} />}
        {activeTab === 'vacation-management' && <ManagerVacationManagement myTeam={myTeam} db={db} />}
      </div>
    </div>
  );
}

export default ManagerView;
