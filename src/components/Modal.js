import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border-t-4 border-blue-500 animate-fade-in-down">
        {title && <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>}
        {children}
        {/* Action buttons are now expected to be part of children if needed, or handled by child components */}
      </div>
    </div>
  );
};
export { Modal };
