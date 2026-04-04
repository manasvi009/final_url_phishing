import { formatTimeAgo } from '../utils/dateUtils';

export default function HistoryTable({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="history-placeholder bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
        <h2 className="text-xl font-bold text-cyan-300 mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent Scans
        </h2>
        <p className="text-cyan-300/70 text-center py-8">No scan history yet. Your URL checks will appear here.</p>
      </div>
    );
  }

  return (
    <div className="history-card bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
      <h2 className="text-xl font-bold text-cyan-300 mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Recent Scans
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-cyan-500/20">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">URL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {history.map((item, i) => {
              const isPhishing = item.label === "phishing";
              return (
                <tr key={item._id || i} className="hover:bg-gray-800/50 transition-all duration-300 ease-in-out border-b border-cyan-500/10">
                  <td className="px-4 py-4 max-w-xs text-sm">
                    <div className="text-cyan-200 font-mono break-words max-w-[200px] transition-colors duration-300">{item.url}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${isPhishing ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                      {item.label.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-cyan-200 font-mono transition-colors duration-300">{item.risk_score.toFixed(4)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-300 transition-colors duration-300">
                    {formatTimeAgo(item.ts || item.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}