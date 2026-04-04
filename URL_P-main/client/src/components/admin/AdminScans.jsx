import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useDebounce from '../../hooks/useDebounce';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

const dateOptions = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

const verdictOptions = ['all', 'normal', 'false_positive', 'confirmed_phishing'];

export default function AdminScans() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [label, setLabel] = useState('all');
  const [verdict, setVerdict] = useState('all');
  const [domain, setDomain] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);

  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/scans', {
        params: { days, page, limit, label, verdict, q: debouncedQ, domain },
      });
      setRows(res.data?.items || []);
      setTotalPages(res.data?.pages || 1);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load scans');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days, page, limit, label, verdict, debouncedQ, domain]);

  const updateVerdict = async (id, newVerdict) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x._id === id ? { ...x, verdict: newVerdict } : x)));
    try {
      await adminApi.patch(`/admin/scans/${id}`, { verdict: newVerdict });
      setToast({ message: 'Verdict updated', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Update failed', type: 'error' });
    }
  };

  const removeScan = (id) => {
    setConfirm({
      open: true,
      title: 'Delete Scan',
      message: 'This will permanently delete the scan record.',
      onConfirm: async () => {
        setConfirm({ open: false, title: '', message: '', onConfirm: null });
        const prev = rows;
        setRows((r) => r.filter((x) => x._id !== id));
        try {
          await adminApi.delete(`/admin/scans/${id}`);
          setToast({ message: 'Scan deleted', type: 'success' });
        } catch (e) {
          setRows(prev);
          setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
        }
      },
    });
  };

  const exportCsv = async () => {
    try {
      const res = await adminApi.get('/admin/scans', { params: { days, page: 1, limit: 1000, label, verdict, q: debouncedQ, domain } });
      const items = res.data?.items || [];
      const header = ['timestamp', 'url', 'domain', 'label', 'verdict', 'risk_score'];
      const lines = [header.join(',')].concat(
        items.map((x) => [x.timestamp || x.ts, JSON.stringify(x.url || ''), x.domain || '', x.label || '', x.verdict || 'normal', x.risk_score ?? 0].join(','))
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scans_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setToast({ message: 'Export failed', type: 'error' });
    }
  };

  const columns = useMemo(() => [
    { key: 'timestamp', title: 'Time', render: (r) => new Date(r.timestamp || r.ts).toLocaleString() },
    { key: 'url', title: 'URL', render: (r) => <span className="font-mono text-xs break-all">{r.url}</span> },
    { key: 'label', title: 'Label' },
    { key: 'verdict', title: 'Verdict', render: (r) => r.verdict || 'normal' },
    { key: 'risk_score', title: 'Risk', render: (r) => Number(r.risk_score || 0).toFixed(3) },
    {
      key: 'actions',
      title: 'Actions',
      render: (r) => (
        <div className="flex gap-2 text-xs">
          <button className="px-2 py-1 bg-blue-700 text-white rounded" onClick={() => navigate(`/admin/reports/${r._id}`)}>View</button>
          <button className="px-2 py-1 bg-green-700 text-white rounded" onClick={() => updateVerdict(r._id, 'false_positive')}>False +</button>
          <button className="px-2 py-1 bg-red-700 text-white rounded" onClick={() => updateVerdict(r._id, 'confirmed_phishing')}>Confirm</button>
          <button className="px-2 py-1 bg-slate-700 text-white rounded" onClick={() => removeScan(r._id)}>Delete</button>
        </div>
      ),
    },
  ], [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Scan Management</h1>
          <p className="text-slate-400 mt-2">Search, review, classify and delete scans</p>
        </div>
        <button onClick={exportCsv} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Export CSV</button>
      </div>

      <FilterBar>
        <select value={days} onChange={(e) => { setPage(1); setDays(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          {dateOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select value={label} onChange={(e) => { setPage(1); setLabel(e.target.value); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          <option value="all">All labels</option>
          <option value="phishing">phishing</option>
          <option value="legitimate">legitimate</option>
        </select>
        <select value={verdict} onChange={(e) => { setPage(1); setVerdict(e.target.value); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          {verdictOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <input value={domain} onChange={(e) => { setPage(1); setDomain(e.target.value); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Domain contains" />
        <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Search URL" />
      </FilterBar>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading scans...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3 mb-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No scans found for selected filters" />}
        <div className="flex items-center justify-between mt-4">
          <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <Pagination page={page} pages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })}
        onConfirm={() => confirm.onConfirm && confirm.onConfirm()}
      />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
