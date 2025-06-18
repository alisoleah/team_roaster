import React from 'react';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500"></div>
    <p className="ml-4 text-lg text-gray-700">Loading application...</p>
  </div>
);

export { LoadingSpinner };
