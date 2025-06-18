import React from 'react';

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

export default OverallRosterView;
