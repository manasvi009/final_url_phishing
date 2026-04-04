import React from 'react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-full max-w-md">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <p className="text-slate-300 text-sm mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-3 py-2 bg-slate-700 text-white rounded">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 bg-red-700 text-white rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}
