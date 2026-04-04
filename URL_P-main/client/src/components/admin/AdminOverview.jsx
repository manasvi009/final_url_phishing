import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/overview', { params: { days } });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load overview');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Overview</h1>
          <p className="text-slate-400 mt-2">Operational security metrics</p>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="px-4 py-2 bg-slate-700 text-white rounded">Refresh</button>
        </div>
      </div>

      {loading && <div className="animate-pulse text-slate-400">Loading overview...</div>}
      {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><p className="text-slate-400 text-sm">Total scans</p><p className="text-white text-2xl font-bold mt-2">{data.total_scans}</p></div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><p className="text-slate-400 text-sm">Phishing</p><p className="text-red-300 text-2xl font-bold mt-2">{data.phishing_count}</p></div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><p className="text-slate-400 text-sm">Legitimate</p><p className="text-green-300 text-2xl font-bold mt-2">{data.legit_count}</p></div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><p className="text-slate-400 text-sm">False Positive</p><p className="text-yellow-300 text-2xl font-bold mt-2">{data.false_positive_count}</p></div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"><p className="text-slate-400 text-sm">Latest scans</p><p className="text-white text-2xl font-bold mt-2">{(data.latest_scans || []).length}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Top Domains</h3>
              <div className="space-y-2 text-sm">
                {(data.top_domains || []).slice(0, 10).map((d, idx) => (
                  <div key={`${d.domain}-${idx}`} className="flex justify-between">
                    <span className="text-slate-200">{d.domain} <span className="text-slate-400">({d.label})</span></span>
                    <span className="text-slate-300">{d.count}</span>
                  </div>
                ))}
                {(data.top_domains || []).length === 0 && <p className="text-slate-400">No domain activity</p>}
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Latest Scans</h3>
              <div className="space-y-2 text-sm">
                {(data.latest_scans || []).map((s) => (
                  <div key={s._id} className="bg-slate-900/40 border border-slate-700 rounded px-2 py-1">
                    <div className="text-slate-400 text-xs">{new Date(s.timestamp || s.ts).toLocaleString()}</div>
                    <div className="text-slate-200 truncate">{s.url}</div>
                  </div>
                ))}
                {(data.latest_scans || []).length === 0 && <p className="text-slate-400">No recent scans</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
