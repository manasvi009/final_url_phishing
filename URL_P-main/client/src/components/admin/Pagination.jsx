import React from 'react';

export default function Pagination({ page, pages, onPageChange }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <button
        className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Prev
      </button>
      <div className="text-slate-300 text-sm">Page {page} of {Math.max(1, pages || 1)}</div>
      <button
        className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= (pages || 1)}
      >
        Next
      </button>
    </div>
  );
}
