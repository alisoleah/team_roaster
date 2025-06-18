import React, { useState } from 'react';
import { UserManagement } from '../components/admin/UserManagement.js';
import { SkillManagement } from '../components/admin/SkillManagement.js';
import OverallRosterView from '../components/shared/OverallRosterView.js'; // Default import

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

export default AdminView;
