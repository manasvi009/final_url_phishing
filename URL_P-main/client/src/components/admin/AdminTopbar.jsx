import React from 'react';
import { useNavigate } from 'react-router-dom';

const SECTION_META = [
  { match: '/admin/overview', title: 'Overview', subtitle: 'Monitor phishing activity and recent scan trends.' },
  { match: '/admin/scans', title: 'Scans', subtitle: 'Review, classify, export, and clean up scan records.' },
  { match: '/admin/reports', title: 'Reports', subtitle: 'Inspect individual scan details and confirm outcomes.' },
  { match: '/admin/users', title: 'Users', subtitle: 'Manage account access, roles, and account status.' },
];

function getSectionMeta(currentPath) {
  return SECTION_META.find((item) => currentPath === item.match || currentPath.startsWith(`${item.match}/`))
    || SECTION_META[0];
}

const AdminTopbar = ({ sidebarOpen, setSidebarOpen, user, currentPath }) => {
  const navigate = useNavigate();
  const section = getSectionMeta(currentPath);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    navigate('/admin/login');
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden text-slate-400 hover:text-white focus:outline-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-xl font-semibold text-white">{section.title}</p>
            <p className="text-sm text-slate-400">{section.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="hidden md:inline-flex px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-700 transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            Open User App
          </button>

          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
            <p className="text-xs text-slate-400">{user?.email || 'admin@cybershield.com'}</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-violet-600 rounded-full p-[2px]">
            <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-sm font-semibold text-white">
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
          <button
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminTopbar;
