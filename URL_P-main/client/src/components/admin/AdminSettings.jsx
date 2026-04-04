import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import Toast from './Toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    default_threshold: 0.5,
    cors_origins: [],
    maintenance_mode: false,
    llm_enabled: true,
    llm_detail_level: 'standard',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [origin, setOrigin] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/settings');
      setSettings((p) => ({ ...p, ...(res.data || {}) }));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await adminApi.patch('/admin/settings', {
        default_threshold: Number(settings.default_threshold),
        cors_origins: settings.cors_origins || [],
        maintenance_mode: !!settings.maintenance_mode,
        llm_enabled: !!settings.llm_enabled,
        llm_detail_level: settings.llm_detail_level,
      });
      setToast({ message: 'Settings updated', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Save failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-2">System configuration and defaults</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
        {loading && <div className="animate-pulse text-slate-400">Loading settings...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">Default threshold
                <input type="number" min="0" max="1" step="0.01" value={settings.default_threshold || 0.5} onChange={(e) => setSettings((p) => ({ ...p, default_threshold: Number(e.target.value) }))} className="mt-1 w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" />
              </label>
              <label className="text-sm text-slate-300">LLM Detail
                <select value={settings.llm_detail_level || 'standard'} onChange={(e) => setSettings((p) => ({ ...p, llm_detail_level: e.target.value }))} className="mt-1 w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
                  <option value="brief">brief</option>
                  <option value="standard">standard</option>
                  <option value="deep">deep</option>
                </select>
              </label>
            </div>

            <div className="flex gap-6 text-sm text-slate-300">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!settings.maintenance_mode} onChange={(e) => setSettings((p) => ({ ...p, maintenance_mode: e.target.checked }))} /> maintenance mode</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!settings.llm_enabled} onChange={(e) => setSettings((p) => ({ ...p, llm_enabled: e.target.checked }))} /> LLM enabled</label>
            </div>

            <div>
              <p className="text-sm text-slate-300 mb-2">CORS origins</p>
              <div className="flex gap-2 mb-2">
                <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="https://domain.com" />
                <button className="px-3 py-2 bg-slate-700 text-white rounded" onClick={() => {
                  if (!origin) return;
                  setSettings((p) => ({ ...p, cors_origins: [...(p.cors_origins || []), origin] }));
                  setOrigin('');
                }}>Add</button>
              </div>
              <div className="space-y-2">
                {(settings.cors_origins || []).map((o) => (
                  <div key={o} className="flex justify-between items-center bg-slate-900/40 border border-slate-700 rounded px-3 py-2 text-sm">
                    <span className="text-slate-200 font-mono">{o}</span>
                    <button className="text-red-400" onClick={() => setSettings((p) => ({ ...p, cors_origins: (p.cors_origins || []).filter((x) => x !== o) }))}>remove</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={save}>Save</button>
              <button className="px-4 py-2 bg-slate-700 text-white rounded" onClick={load}>Reload</button>
            </div>
          </>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
