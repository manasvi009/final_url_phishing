import { useState, useEffect } from 'react';
import api from '../api/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    date: 'all'
  });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/user/history');
        setHistory(response.data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = history.filter(item => {
    if (filters.status !== 'all' && item.label !== filters.status) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status) => {
    return status === 'phishing' 
      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
      : 'bg-green-500/20 text-green-400 border border-green-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-indigo-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-cyan-200">Loading your scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-indigo-900 to-violet-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="dashboard-header mb-10 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 bg-clip-text text-transparent">
            Scan History
          </h1>
          <p className="text-xl text-cyan-200 max-w-2xl mx-auto">
            Review your URL scanning activity and threat detection history
          </p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-cyan-500/30 p-8 shadow-lg shadow-cyan-500/10">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8 p-6 bg-gray-800/30 rounded-xl border border-cyan-500/20">
            <div>
              <label className="block text-cyan-200 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-4 py-2 bg-gray-700 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="phishing">Phishing</option>
                <option value="legitimate">Legitimate</option>
              </select>
            </div>
            <div>
              <label className="block text-cyan-200 mb-2">Date Range</label>
              <select
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value})}
                className="px-4 py-2 bg-gray-700 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center">
                <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-cyan-300 text-sm transition-colors duration-300">Total Scans</p>
                  <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{history.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 backdrop-blur-md p-6 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center">
                <div className="p-3 bg-red-500/10 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-cyan-300 text-sm transition-colors duration-300">Threats Blocked</p>
                  <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{history.filter(h => h.label === 'phishing').length}</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:transform hover:scale-105">
              <div className="flex items-center">
                <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-cyan-300 text-sm transition-colors duration-300">Safe URLs</p>
                  <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{history.filter(h => h.label === 'legitimate').length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cyan-500/20">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredHistory.map((item, index) => (
                    <tr key={item._id || index} className="hover:bg-gray-800/50 transition-all duration-300 ease-in-out border-b border-cyan-500/10">
                      <td className="px-6 py-4 max-w-xs text-sm">
                        <div className="text-cyan-200 font-mono break-words max-w-[200px] transition-colors duration-300">{item.url}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${getStatusColor(item.label)}`}>
                          {item.label.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-cyan-200 font-mono transition-colors duration-300">{item.risk_score.toFixed(4)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-300 transition-colors duration-300">
                        {new Date(item.ts || item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-cyan-300 mb-2">No scan history</h3>
              <p className="text-cyan-200/80">Your URL scans will appear here once you start using the service.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}