import React from 'react';

// Manager's Team Roster Display
function ManagerTeamRoster({ myTeam, skills }) {
  if (!myTeam || myTeam.length === 0) {
    return <p className="text-gray-600 p-4">You currently have no engineers assigned to your team.</p>;
  }

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

export default ManagerTeamRoster;
