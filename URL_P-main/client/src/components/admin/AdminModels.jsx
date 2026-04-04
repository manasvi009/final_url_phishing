import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import DataTable from './DataTable';
import Toast from './Toast';

export default function AdminModels() {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState({ default_threshold: 0.5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ name: 'Uploaded Model', version: 'custom' });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [m, s] = await Promise.all([adminApi.get('/admin/models'), adminApi.get('/admin/settings')]);
      setRows(m.data?.items || []);
      if (s.data?.default_threshold !== undefined) setSettings({ default_threshold: s.data.default_threshold });
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', meta.name);
    fd.append('version', meta.version);
    try {
      await adminApi.post('/admin/models/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setToast({ message: 'Model uploaded', type: 'success' });
      setFile(null);
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Upload failed', type: 'error' });
    }
  };

  const activate = async (id) => {
    try {
      await adminApi.post(`/admin/models/${id}/activate`);
      setToast({ message: 'Model activated', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Activation failed', type: 'error' });
    }
  };

  const evaluate = async (id) => {
    try {
      await adminApi.post(`/admin/models/${id}/evaluate`);
      setToast({ message: 'Model evaluated', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Evaluation failed', type: 'error' });
    }
  };

  const removeModel = async (id) => {
    try {
      await adminApi.delete(`/admin/models/${id}`);
      setToast({ message: 'Model deleted', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  const saveThreshold = async () => {
    try {
      await adminApi.patch('/admin/settings', { default_threshold: Number(settings.default_threshold) });
      setToast({ message: 'Threshold updated', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.detail || 'Threshold update failed', type: 'error' });
    }
  };

  const columns = useMemo(() => [
    { key: 'name', title: 'Name' },
    { key: 'version', title: 'Version' },
    { key: 'is_active', title: 'Active', render: (r) => (r.is_active ? 'yes' : 'no') },
    { key: 'metrics', title: 'Metrics', render: (r) => `acc:${r.metrics?.accuracy ?? 0} prec:${r.metrics?.precision ?? 0} rec:${r.metrics?.recall ?? 0} auc:${r.metrics?.auc ?? 0}` },
    {
      key: 'actions', title: 'Actions', render: (r) => (
        <div className="flex gap-2">
          <button className="px-2 py-1 bg-blue-700 text-white rounded text-xs" onClick={() => evaluate(r._id)}>Evaluate</button>
          {!r.is_active && <button className="px-2 py-1 bg-green-700 text-white rounded text-xs" onClick={() => activate(r._id)}>Activate</button>}
          {!r.is_active && <button className="px-2 py-1 bg-red-700 text-white rounded text-xs" onClick={() => removeModel(r._id)}>Delete</button>}
        </div>
      )
    },
  ], [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Models</h1>
        <p className="text-slate-400 mt-2">Upload, activate, evaluate and tune threshold</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid md:grid-cols-4 gap-3 items-end">
        <input value={meta.name} onChange={(e) => setMeta((p) => ({ ...p, name: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Model name" />
        <input value={meta.version} onChange={(e) => setMeta((p) => ({ ...p, version: e.target.value }))} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Version" />
        <input type="file" accept=".pkl" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-slate-200 text-sm" />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={upload}>Upload</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex gap-2 items-center">
        <label className="text-sm text-slate-300">Default threshold</label>
        <input type="number" min="0" max="1" step="0.01" value={settings.default_threshold} onChange={(e) => setSettings({ default_threshold: Number(e.target.value) })} className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1" />
        <button className="px-3 py-1 bg-violet-700 text-white rounded" onClick={saveThreshold}>Save</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading models...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No model records" />}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
