export default function ResultCard({ result }) {
  if (!result) return (
    <div className="result-placeholder bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/20 flex items-center justify-center h-full shadow-lg shadow-cyan-500/10">
      <div className="text-center">
        <div className="text-cyan-300 text-lg mb-2">No scan results yet</div>
        <div className="text-cyan-400/70 text-sm">Enter a URL to analyze</div>
      </div>
    </div>
  );

  const isPhishing = result.label === "phishing";

  return (
    <div className="result-card bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 transition-all duration-300 ease-in-out">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-cyan-300 mb-2 transition-colors duration-300">Scanned URL</h3>
          <p className="text-white font-mono break-words text-sm bg-gray-800/50 p-3 rounded-lg border border-cyan-500/20 transition-all duration-300">
            {result.url}
          </p>
        </div>
        <div className={`ml-4 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${isPhishing ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
          {result.label.toUpperCase()}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-cyan-300 transition-colors duration-300">Risk Score</span>
          <span className="text-white font-bold transition-colors duration-300">{result.risk_score.toFixed(4)}</span>
        </div>
        <div className="w-full bg-gray-800/50 rounded-full h-3 border border-cyan-500/20 overflow-hidden transition-all duration-300">
          <div 
            className={`h-3 rounded-full transition-all duration-700 ease-out ${isPhishing ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-violet-500'}`}
            style={{ width: `${result.risk_score * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800/50 p-3 rounded-lg border border-cyan-500/20">
          <div className="text-cyan-300 mb-1">Threshold</div>
          <div className="text-white font-mono">{result.threshold}</div>
        </div>
        <div className="bg-gray-800/50 p-3 rounded-lg border border-cyan-500/20">
          <div className="text-cyan-300 mb-1">Status</div>
          <div className={`font-bold ${isPhishing ? 'text-red-400' : 'text-cyan-400'}`}>
            {isPhishing ? 'THREAT DETECTED' : 'SAFE'}
          </div>
        </div>
      </div>

      {result.explanation && (
        <div className="mt-6 pt-6 border-t border-cyan-500/20">
          <h4 className="text-lg font-medium text-cyan-300 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Analysis
          </h4>
          <p className="text-cyan-300/80 text-sm leading-relaxed">
            {result.explanation}
          </p>
        </div>
      )}
    </div>
  );
}