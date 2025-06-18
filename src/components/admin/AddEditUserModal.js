import React, { useState, useEffect } from 'react';

// --- Add/Edit User Modal Component ---
// This component now renders the form content, and expects to be wrapped by a generic Modal component.
function AddEditUserModal({ onSave, onClose, user, managers, availableSkills }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Engineer', // Default role for new users
    managerId: '',
    workingHours: '',
    shiftPattern: '',
    vacationDates: [],
    skills: [],
    srThreshold: 0,
    currentSrCount: 0, // currentSrCount is usually managed by SR assignment, not direct edit. Included for completeness from original.
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Engineer',
        managerId: user.managerId || '',
        workingHours: user.workingHours || '',
        shiftPattern: user.shiftPattern || '',
        vacationDates: user.vacationDates || [],
        skills: user.skills || [],
        srThreshold: user.srThreshold || 0,
        currentSrCount: user.currentSrCount || 0,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'Engineer',
        managerId: '',
        workingHours: '',
        shiftPattern: '',
        vacationDates: [],
        skills: [],
        srThreshold: 0,
        currentSrCount: 0,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData(prev => ({ ...prev, skills: selectedOptions }));
  };

  const handleAddVacationDate = (e) => {
    e.preventDefault();
    const dateInput = e.target.form.elements.newVacationDate; // Access input relative to form
    const newDate = dateInput.value;
    if (newDate && !formData.vacationDates.includes(newDate)) {
      setFormData(prev => ({
        ...prev,
        vacationDates: [...prev.vacationDates, newDate].sort()
      }));
      dateInput.value = '';
    }
  };

  const handleRemoveVacationDate = (dateToRemove) => {
    setFormData(prev => ({
      ...prev,
      vacationDates: prev.vacationDates.filter(date => date !== dateToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    // onClose(); // Typically, the parent (UserManagement) closes the modal after save
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Engineer">Engineer</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>
      {(formData.role === 'Engineer' || formData.role === 'Viewer') && (
        <div>
          <label htmlFor="managerId" className="block text-sm font-medium text-gray-700">Manager</label>
          <select
            id="managerId"
            name="managerId"
            value={formData.managerId}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Manager (Optional)</option>
            {managers.map(manager => (
              <option key={manager.id} value={manager.id}>{manager.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="workingHours" className="block text-sm font-medium text-gray-700">Working Hours (e.g., 9 AM - 5 PM)</label>
        <input
          type="text"
          id="workingHours"
          name="workingHours"
          value={formData.workingHours}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="shiftPattern" className="block text-sm font-medium text-gray-700">Shift Pattern (e.g., Day Shift, Rotational)</label>
        <input
          type="text"
          id="shiftPattern"
          name="shiftPattern"
          value={formData.shiftPattern}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
        <select
          id="skills"
          name="skills"
          multiple
          value={formData.skills}
          onChange={handleSkillsChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 h-24"
        >
          {availableSkills.map(skill => (
            <option key={skill.value} value={skill.value}>{skill.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple skills.</p>
      </div>
      {formData.role === 'Engineer' && (
        <div>
          <label htmlFor="srThreshold" className="block text-sm font-medium text-gray-700">SR Threshold</label>
          <input
            type="number"
            id="srThreshold"
            name="srThreshold"
            value={formData.srThreshold}
            onChange={handleChange}
            min="0"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
      <div>
        <label htmlFor="vacationDates" className="block text-sm font-medium text-gray-700 mb-2">Vacation Dates</label>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="date"
            id="newVacationDate" // Keep ID for label association if any, or direct access
            name="newVacationDate" // Add name for form handling
            className="border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button" // Important: type="button" to prevent form submission
            onClick={handleAddVacationDate}
            className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200 ease-in-out shadow-sm text-sm"
          >
            Add Date
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.vacationDates.map(date => (
            <span key={date} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {date}
              <button
                type="button" // Important: type="button"
                onClick={() => handleRemoveVacationDate(date)}
                className="ml-1 -mr-0.5 h-4 w-4 flex-shrink-0 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
              >
                <span className="sr-only">Remove date</span>
                <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
        <button
          type="button" // Important: type="button" to not submit the form
          onClick={onClose} // Call the passed onClose prop
          className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-200 ease-in-out shadow-sm mr-3"
        >
          Cancel
        </button>
        <button
          type="submit" // This button will submit the form
          className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 ease-in-out shadow-md"
        >
          {user ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  );
}

export { AddEditUserModal };
