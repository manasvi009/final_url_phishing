import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from './DataTable';
import Toast from './Toast';

export default function AdminAPIKeys() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [newKey, setNewKey] = useState('');
  const [form, setForm] = useState({ name: '', rate_limit: 1000 });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/api-keys');
      setRows(res.data?.items || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load API keys');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createKey = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.post('/admin/api-keys', form);
      setNewKey(res.data?.api_key || '');
      setForm({ name: '', rate_limit: 1000 });
      setToast({ message: 'API key created', type: 'success' });
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.detail || 'Create failed', type: 'error' });
    }
  };

  const patchKey = async (id, body) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x._id === id ? { ...x, ...body } : x)));
    try {
      await adminApi.patch(`/admin/api-keys/${id}`, body);
      setToast({ message: 'API key updated', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Update failed', type: 'error' });
    }
  };

  const deleteKey = async (id) => {
    const prev = rows;
    setRows((r) => r.filter((x) => x._id !== id));
    try {
      await adminApi.delete(`/admin/api-keys/${id}`);
      setToast({ message: 'API key deleted', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const columns = useMemo(() => [
    { key: 'name', title: 'Name' },
    { key: 'key_prefix', title: 'Prefix', render: (r) => `${r.key_prefix || ''}***` },
    {
      key: 'rate_limit', title: 'Rate Limit', render: (r) => (
        <input
          type="number"
          defaultValue={r.rate_limit}
          onBlur={(e) => patchKey(r._id, { rate_limit: Number(e.target.value) })}
          className="w-24 bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-xs"
        />
      )
    },
    { key: 'status', title: 'Status' },
    {
      key: 'actions', title: 'Actions', render: (r) => (
        <div className="flex gap-2 text-xs">
          <button className="px-2 py-1 bg-slate-700 text-white rounded" onClick={() => patchKey(r._id, { status: r.status === 'active' ? 'revoked' : 'active' })}>{r.status === 'active' ? 'Revoke' : 'Enable'}</button>
          <button className="px-2 py-1 bg-red-700 text-white rounded" onClick={() => deleteKey(r._id)}>Delete</button>
        </div>
      )
    },
  ], [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">API Keys</h1>
        <p className="text-slate-400 mt-2">Create, revoke, enable and delete keys</p>
      </div>

      {newKey && (
        <div className="bg-green-900/30 border border-green-700 rounded p-3 text-green-200 text-sm">
          New API key: <span className="font-mono break-all">{newKey}</span>
        </div>
      )}

      <form onSubmit={createKey} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid md:grid-cols-3 gap-3">
        <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Key name" required />
        <input type="number" value={form.rate_limit} onChange={(e) => setForm((p) => ({ ...p, rate_limit: Number(e.target.value) }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Create Key</button>
      </form>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading API keys...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No API keys" />}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
