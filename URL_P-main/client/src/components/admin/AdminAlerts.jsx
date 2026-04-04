import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from './DataTable';
import Pagination from './Pagination';
import Toast from './Toast';

export default function AdminAlerts() {
  const [tab, setTab] = useState('rules');
  const [ruleRows, setRuleRows] = useState([]);
  const [logRows, setLogRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pages, setPages] = useState(1);

  const [form, setForm] = useState({ name: '', condition_type: 'risk_score', condition_value: 0.95, enabled: true });

  const loadRules = async () => {
    const res = await adminApi.get('/admin/alert-rules');
    setRuleRows(res.data?.items || []);
  };

  const loadLogs = async () => {
    const res = await adminApi.get('/admin/alert-logs', { params: { days, page, limit } });
    setLogRows(res.data?.items || []);
    setPages(res.data?.pages || 1);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadRules(), loadLogs()]);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days, page, limit]);

  const createRule = async (e) => {
    e.preventDefault();
    try {
      await adminApi.post('/admin/alert-rules', form);
      setForm({ name: '', condition_type: 'risk_score', condition_value: 0.95, enabled: true });
      setToast({ message: 'Alert rule created', type: 'success' });
      loadRules();
    } catch (e2) {
      setToast({ message: e2.response?.data?.detail || 'Create failed', type: 'error' });
    }
  };

  const patchRule = async (id, body) => {
    const prev = ruleRows;
    setRuleRows((r) => r.map((x) => (x._id === id ? { ...x, ...body } : x)));
    try {
      await adminApi.patch(`/admin/alert-rules/${id}`, body);
      setToast({ message: 'Rule updated', type: 'success' });
    } catch (e) {
      setRuleRows(prev);
      setToast({ message: e.response?.data?.detail || 'Update failed', type: 'error' });
    }
  };

  const removeRule = async (id) => {
    const prev = ruleRows;
    setRuleRows((r) => r.filter((x) => x._id !== id));
    try {
      await adminApi.delete(`/admin/alert-rules/${id}`);
      setToast({ message: 'Rule deleted', type: 'success' });
    } catch (e) {
      setRuleRows(prev);
      setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const ruleColumns = useMemo(() => [
    { key: 'name', title: 'Name' },
    { key: 'condition_type', title: 'Condition' },
    { key: 'condition_value', title: 'Value' },
    { key: 'enabled', title: 'Status', render: (r) => <button className={`px-2 py-1 text-xs rounded ${r.enabled ? 'bg-green-700' : 'bg-red-700'} text-white`} onClick={() => patchRule(r._id, { enabled: !r.enabled })}>{r.enabled ? 'enabled' : 'disabled'}</button> },
    { key: 'actions', title: 'Actions', render: (r) => <button className="px-2 py-1 bg-slate-700 text-white rounded text-xs" onClick={() => removeRule(r._id)}>Delete</button> },
  ], [ruleRows]);

  const logColumns = useMemo(() => [
    { key: 'timestamp', title: 'Time', render: (r) => new Date(r.timestamp || r.ts).toLocaleString() },
    { key: 'rule_name', title: 'Rule' },
    { key: 'message', title: 'Message' },
    { key: 'severity', title: 'Severity' },
    { key: 'acknowledged', title: 'Ack', render: (r) => (r.acknowledged ? 'yes' : 'no') },
  ], [logRows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Alerts</h1>
        <p className="text-slate-400 mt-2">Manage alert rules and monitor triggered logs</p>
      </div>

      <div className="flex gap-2">
        <button className={`px-4 py-2 rounded ${tab === 'rules' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`} onClick={() => setTab('rules')}>Rules</button>
        <button className={`px-4 py-2 rounded ${tab === 'logs' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`} onClick={() => setTab('logs')}>Logs</button>
      </div>

      {tab === 'rules' ? (
        <>
          <form onSubmit={createRule} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid md:grid-cols-5 gap-3">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Rule name" required />
            <select value={form.condition_type} onChange={(e) => setForm((p) => ({ ...p, condition_type: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
              <option value="phishing_rate">phishing_rate</option>
              <option value="domain_count">domain_count</option>
              <option value="risk_score">risk_score</option>
            </select>
            <input type="number" step="0.01" value={form.condition_value} onChange={(e) => setForm((p) => ({ ...p, condition_value: Number(e.target.value) }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" />
            <label className="text-slate-300 text-sm flex items-center gap-2"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} /> enabled</label>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Create</button>
          </form>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            {loading && <div className="animate-pulse text-slate-400">Loading alert rules...</div>}
            {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
            {!loading && !error && <DataTable columns={ruleColumns} rows={ruleRows} emptyText="No alert rules" />}
          </div>
        </>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
          <div className="flex gap-2 items-center">
            <select value={days} onChange={(e) => { setPage(1); setDays(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          {loading && <div className="animate-pulse text-slate-400">Loading alert logs...</div>}
          {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
          {!loading && !error && <DataTable columns={logColumns} rows={logRows} emptyText="No alert logs" />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
