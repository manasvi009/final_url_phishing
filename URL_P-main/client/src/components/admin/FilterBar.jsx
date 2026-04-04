import React from 'react';

export default function FilterBar({ children }) {
  return <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">{children}</div>;
}
