import { useState } from "react";

export default function UrlForm({ onPredict, canScan, getRemainingScans, isLoggedIn }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    await onPredict(url);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={isLoggedIn ? "Enter URL to scan for threats..." : `Enter URL to scan (${getRemainingScans()} free scans left)...`}
          className="flex-1 px-6 py-4 bg-gray-900/70 border border-cyan-500/30 rounded-xl text-white placeholder-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
          required
          disabled={(!isLoggedIn && getRemainingScans() <= 0) || loading}
        />
        <button
          type="submit"
          disabled={(!isLoggedIn && getRemainingScans() <= 0) || loading}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold rounded-xl hover:from-cyan-700 hover:to-violet-700 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Scanning...
            </div>
          ) : (
            "Scan URL"
          )}
        </button>
      </div>
    </form>
  );
}