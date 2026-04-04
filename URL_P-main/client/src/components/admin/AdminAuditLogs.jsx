import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import useDebounce from '../../hooks/useDebounce';
import DataTable from './DataTable';
import Pagination from './Pagination';

export default function AdminAuditLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [pages, setPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/audit', { params: { page, limit, q: dq } });
      setRows(res.data?.items || []);
      setPages(res.data?.pages || 1);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load audit logs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit, dq]);

  const columns = useMemo(() => [
    { key: 'timestamp', title: 'Time', render: (r) => new Date(r.timestamp || r.ts).toLocaleString() },
    { key: 'actor_email', title: 'Actor' },
    { key: 'action', title: 'Action' },
    {
      key: 'payload',
      title: 'Payload',
      render: (r) => (
        <div>
          <button
            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-white"
            onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
          >
            {expandedId === r._id ? 'Hide' : 'View'} payload
          </button>
          {expandedId === r._id && (
            <pre className="text-xs whitespace-pre-wrap mt-2 bg-slate-900/60 p-2 rounded border border-slate-700">
              {JSON.stringify(r.payload || {}, null, 2)}
            </pre>
          )}
        </div>
      ),
    },
  ], [expandedId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400 mt-2">Search all admin actions and system changes</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex gap-2 items-center">
        <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="flex-1 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Search actor/action" />
        <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <button onClick={load} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Refresh</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading audit logs...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No audit entries found" />}
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </div>
  );
}
