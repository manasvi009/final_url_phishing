import React, { useEffect, useMemo, useState } from 'react';
import adminApi from '../../api/adminApi';
import useDebounce from '../../hooks/useDebounce';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

export default function AdminUsers({ userRole }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [pages, setPages] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/admin/users', { params: { page, limit, q: debouncedQ } });
      setRows(res.data?.items || []);
      setPages(res.data?.pages || 1);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit, debouncedQ]);

  const canManageUsers = userRole === 'super_admin';

  const patchUser = async (id, body) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x._id === id ? { ...x, ...body } : x)));
    try {
      await adminApi.patch(`/admin/users/${id}`, body);
      setToast({ message: 'User updated', type: 'success' });
    } catch (e) {
      setRows(prev);
      setToast({ message: e.response?.data?.detail || 'Update failed', type: 'error' });
    }
  };

  const deleteUser = (id) => {
    setConfirm({
      open: true,
      title: 'Delete User',
      message: 'Only super_admin can perform this action. Continue?',
      onConfirm: async () => {
        setConfirm({ open: false, title: '', message: '', onConfirm: null });
        const prev = rows;
        setRows((r) => r.filter((x) => x._id !== id));
        try {
          await adminApi.delete(`/admin/users/${id}`);
          setToast({ message: 'User deleted', type: 'success' });
        } catch (e) {
          setRows(prev);
          setToast({ message: e.response?.data?.detail || 'Delete failed', type: 'error' });
        }
      },
    });
  };

  const columns = useMemo(() => [
    { key: 'username', title: 'Username' },
    { key: 'email', title: 'Email' },
    {
      key: 'role', title: 'Role', render: (r) => (
        <select value={r.role || 'user'} onChange={(e) => patchUser(r._id, { role: e.target.value })} disabled={!canManageUsers} className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="user">user</option>
          <option value="analyst">analyst</option>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
      )
    },
    {
      key: 'is_active', title: 'Status', render: (r) => (
        <button onClick={() => patchUser(r._id, { is_active: !r.is_active })} className={`px-2 py-1 text-xs rounded ${r.is_active ? 'bg-green-700' : 'bg-red-700'} text-white`}>
          {r.is_active ? 'active' : 'inactive'}
        </button>
      )
    },
    { key: 'last_login', title: 'Last Login', render: (r) => (r.last_login ? new Date(r.last_login).toLocaleString() : 'Never') },
    {
      key: 'actions',
      title: 'Actions',
      render: (r) => canManageUsers
        ? <button onClick={() => deleteUser(r._id)} className="px-2 py-1 bg-red-700 text-white rounded text-xs">Delete</button>
        : <span className="text-xs text-slate-400">Super admin only</span>,
    },
  ], [rows, canManageUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-slate-400 mt-2">Manage users, roles, and account status</p>
      </div>

      {!canManageUsers && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300">
          Role changes and account deletion are limited to the `super_admin` account.
        </div>
      )}

      <FilterBar>
        <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="md:col-span-4 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2" placeholder="Search user/email" />
        <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2">
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </FilterBar>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        {loading && <div className="animate-pulse text-slate-400">Loading users...</div>}
        {!loading && error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3">{error}</div>}
        {!loading && !error && <DataTable columns={columns} rows={rows} emptyText="No users found" />}
        <Pagination page={page} pages={pages} onPageChange={setPage} />
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
