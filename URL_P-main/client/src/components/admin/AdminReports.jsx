import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import useDebounce from '../../hooks/useDebounce';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import Pagination from './Pagination';
import Toast from './Toast';

export default function AdminReports() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [recent, setRecent] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [pages, setPages] = useState(1);

  const loadList = async () => {
    const res = await adminApi.get('/admin/reports', { params: { days, page, limit, q: debouncedQ } });
    setRows(res.data?.items || []);
    setPages(res.data?.pages || 1);
  };

  const loadDetail = async (reportId) => {
    const res = await adminApi.get(`/admin/reports/${reportId}`);
    setReportData(res.data || null);
    setRecent(res.data?.recent_scans || []);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      await loadList();
      if (id) await loadDetail(id);
      else {
        setReportData(null);
        setRecent([]);
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days, page, limit, debouncedQ, id]);

  const applyAction = async (action) => {
    if (!id) return;
    try {
      await adminApi.post(`/admin/reports/${id}/${action}`);
      setToast({ message: 'Report updated', type: 'success' });
      await load();
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Action failed', type: 'error' });
    }
  };

  const listColumns = useMemo(() => [
    { key: 'ts', title: 'Time', render: (r) => new Date(r.timestamp || r.ts).toLocaleString() },
    { key: 'url', title: 'URL', render: (r) => <span className="font-mono text-xs break-all">{r.url}</span> },
    { key: 'label', title: 'Label' },
    { key: 'risk', title: 'Risk', render: (r) => Number(r.risk_score || 0).toFixed(3) },
    { key: 'review', title: 'Review', render: (r) => r.review?.verdict || r.verdict || 'normal' },
    { key: 'actions', title: 'Actions', render: (r) => <button className="px-2 py-1 bg-blue-700 text-white rounded text-xs" onClick={() => navigate(`/admin/reports/${r._id}`)}>Open</button> },
  ], []);

  if (!id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 mt-2">Review and investigate scan reports</p>
        </div>

        <FilterBar>
          <select value={days} onChange={(e) => { setPage(1); setDays(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 md:col-span-3" placeholder="Search reports by URL" />
          <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </FilterBar>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          {loading && <div className="animate-pulse text-slate-400">Loading reports...</div>}
          {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
          {!loading && !error && <DataTable columns={listColumns} rows={rows} emptyText="No reports found" />}
          <Pagination page={page} pages={pages} onPageChange={setPage} />
        </div>
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      </div>
    );
  }

  const report = reportData?.report;
  const features = report?.features ? Object.entries(report.features) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Report Detail</h1>
          <p className="text-slate-400 mt-2">Deep-dive for scan {id}</p>
        </div>
        <button onClick={() => navigate('/admin/reports')} className="px-4 py-2 bg-slate-700 text-white rounded">Back to Reports</button>
      </div>

      {loading && <div className="animate-pulse text-slate-400">Loading report...</div>}
      {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
      {!loading && report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Recent Scans</h3>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {recent.map((x) => (
                <button key={x._id} onClick={() => navigate(`/admin/reports/${x._id}`)} className={`w-full text-left px-3 py-2 rounded ${x._id === id ? 'bg-slate-700' : 'bg-slate-900/50'}`}>
                  <div className="text-xs text-slate-400">{new Date(x.timestamp || x.ts).toLocaleString()}</div>
                  <div className="text-xs text-white truncate">{x.url}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-slate-300 text-sm">URL</p>
              <p className="text-white font-mono text-sm break-all">{report.url}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-slate-900/40 rounded p-3"><p className="text-xs text-slate-400">Label</p><p className="text-sm text-white">{report.label}</p></div>
              <div className="bg-slate-900/40 rounded p-3"><p className="text-xs text-slate-400">Risk</p><p className="text-sm text-white">{Number(report.risk_score || 0).toFixed(3)}</p></div>
              <div className="bg-slate-900/40 rounded p-3"><p className="text-xs text-slate-400">Verdict</p><p className="text-sm text-white">{report.verdict || 'normal'}</p></div>
              <div className="bg-slate-900/40 rounded p-3"><p className="text-xs text-slate-400">Domain</p><p className="text-sm text-white">{report.domain || '-'}</p></div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-2 bg-green-700 text-white rounded text-sm" onClick={() => applyAction('mark-false-positive')}>Mark False Positive</button>
              <button className="px-3 py-2 bg-red-700 text-white rounded text-sm" onClick={() => applyAction('confirm-phishing')}>Confirm Phishing</button>
            </div>

            <div className="bg-slate-900/40 rounded p-3">
              <p className="text-xs text-slate-400 mb-2">Explanation</p>
              <p className="text-sm text-slate-200">{report.explanation || 'No explanation available.'}</p>
            </div>

            <div className="bg-slate-900/40 rounded p-3">
              <p className="text-xs text-slate-400 mb-2">Features</p>
              {features.length === 0 ? (
                <p className="text-sm text-slate-400">No features available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {features.map(([k, v]) => <div key={k} className="text-xs text-slate-200 bg-slate-800 rounded px-2 py-1 flex justify-between"><span>{k}</span><span>{String(v)}</span></div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
