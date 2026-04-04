import React from 'react';

export default function DataTable({ columns, rows, emptyText = 'No records found', rowKey = '_id' }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/40">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-slate-400" colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r[rowKey] || JSON.stringify(r)} className="hover:bg-slate-900/30">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-sm text-slate-200">{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
