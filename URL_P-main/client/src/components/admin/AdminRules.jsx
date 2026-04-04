import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from './DataTable';
import Toast from './Toast';

export default function AdminRules() {
  const [listType, setListType] = useState('blacklist');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [form, setForm] = useState({ list: 'blacklist', pattern: '', type: 'domain', description: '', enabled: true });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/rules', { params: { list: listType } });
      setRows(res.data?.items || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load rules');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [listType]);

  const createRule = async (e) => {
    e.preventDefault();
    try {
      await adminApi.post('/admin/rules', form);
      setForm((p) => ({ ...p, pattern: '', description: '' }));
      setToast({ message: 'Rule added', type: 'success' });
      load();
    } catch (e2) {
      setToast({ message: e2.response?.data?.detail || 'Create failed', type: 'error' });
    }
  };

  const patchRule = async (id, body) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x._id === id ? { ...x, ...body } : x)));
    try {
      await adminApi.patch(`/admin/rules/${id}`, body);
      setToast({ message: 'Rule updated', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Update failed', type: 'error' });
    }
  };

  const removeRule = async (id) => {
    const prev = rows;
    setRows((r) => r.filter((x) => x._id !== id));
    try {
      await adminApi.delete(`/admin/rules/${id}`);
      setToast({ message: 'Rule deleted', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const columns = useMemo(() => [
    { key: 'pattern', title: 'Pattern' },
    { key: 'type', title: 'Type' },
    { key: 'description', title: 'Description' },
    {
      key: 'enabled', title: 'Status', render: (r) => (
        <button className={`px-2 py-1 rounded text-xs ${r.enabled ? 'bg-green-700' : 'bg-red-700'} text-white`} onClick={() => patchRule(r._id, { enabled: !r.enabled })}>{r.enabled ? 'enabled' : 'disabled'}</button>
      )
    },
    { key: 'actions', title: 'Actions', render: (r) => <button onClick={() => removeRule(r._id)} className="px-2 py-1 bg-slate-700 text-white rounded text-xs">Delete</button> },
  ], [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Rules</h1>
        <p className="text-slate-400 mt-2">Manage blacklist and whitelist rules</p>
      </div>

      <div className="flex gap-2">
        <button className={`px-4 py-2 rounded ${listType === 'blacklist' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`} onClick={() => { setListType('blacklist'); setForm((p) => ({ ...p, list: 'blacklist' })); }}>Blacklist</button>
        <button className={`px-4 py-2 rounded ${listType === 'whitelist' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`} onClick={() => { setListType('whitelist'); setForm((p) => ({ ...p, list: 'whitelist' })); }}>Whitelist</button>
      </div>

      <form onSubmit={createRule} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid md:grid-cols-5 gap-3">
        <input value={form.pattern} onChange={(e) => setForm((p) => ({ ...p, pattern: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Pattern" required />
        <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          <option value="domain">domain</option>
          <option value="url">url</option>
        </select>
        <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 md:col-span-2" placeholder="Description" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Add Rule</button>
      </form>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading rules...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No rules found" />}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
