import React from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  const color = type === 'error' ? 'bg-red-700' : type === 'success' ? 'bg-green-700' : 'bg-blue-700';
  return (
    <div className={`fixed bottom-4 right-4 ${color} text-white px-4 py-2 rounded-lg shadow-lg z-50`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onClose} className="text-white/80">x</button>
      </div>
    </div>
  );
}
