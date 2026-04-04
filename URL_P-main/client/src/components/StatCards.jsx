export default function StatCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="stat-card bg-gradient-to-br from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 ease-in-out hover:transform hover:scale-105">
        <div className="flex items-center">
          <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-cyan-300 text-sm transition-colors duration-300">Total Scans</p>
            <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{stats.total_scans}</div>
          </div>
        </div>
      </div>

      <div className="stat-card bg-gradient-to-br from-red-900/30 to-red-800/20 backdrop-blur-md p-6 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10 transition-all duration-300 ease-in-out hover:transform hover:scale-105">
        <div className="flex items-center">
          <div className="p-3 bg-red-500/10 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-cyan-300 text-sm transition-colors duration-300">Phishing Detected</p>
            <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{stats.phishing_scans}</div>
          </div>
        </div>
      </div>

      <div className="stat-card bg-gradient-to-br from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 ease-in-out hover:transform hover:scale-105">
        <div className="flex items-center">
          <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-cyan-300 text-sm transition-colors duration-300">Safe URLs</p>
            <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{stats.legitimate_scans}</div>
          </div>
        </div>
      </div>

      <div className="stat-card bg-gradient-to-br from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 ease-in-out hover:transform hover:scale-105">
        <div className="flex items-center">
          <div className="p-3 bg-cyan-500/10 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-cyan-300 text-sm transition-colors duration-300">Threat Rate</p>
            <div className="text-2xl font-bold text-cyan-200 transition-colors duration-300">{(stats.phishing_rate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}