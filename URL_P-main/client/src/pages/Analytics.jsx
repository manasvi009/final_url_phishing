import { useEffect, useState } from "react";
import api from "../api/api";
import StatCards from "../components/StatCards";
import LoadingSpinner from "../components/LoadingSpinner";
import Toast from "../components/Toast";

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get("/stats/summary");
        setStats(res.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        showToast("Failed to load analytics data", "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="analytics-content py-10 max-w-6xl mx-auto px-4">
      <div className="analytics-header mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 bg-clip-text text-transparent">Cybersecurity Analytics</h1>
        <p className="text-xl text-cyan-200 max-w-2xl mx-auto">Track your URL scanning activity and threat detection trends</p>
      </div>
      <div className="analytics-stats-card bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 mb-10 shadow-lg shadow-cyan-500/10">
        <StatCards stats={stats} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}