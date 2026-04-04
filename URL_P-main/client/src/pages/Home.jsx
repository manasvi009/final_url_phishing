import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import useScanLimit from "../hooks/useScanLimit";
import UrlForm from "../components/UrlForm";
import ResultCard from "../components/ResultCard";
import HistoryTable from "../components/HistoryTable";
import Toast from "../components/Toast";

export default function Home() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const { canScan, getRemainingScans, incrementScanCount, isLoggedIn, scanCount } = useScanLimit();
  const navigate = useNavigate();

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  const predictAsGuest = async (url) => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${baseUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      const message = data?.detail || "Prediction failed";
      throw new Error(message);
    }

    return data;
  };

  const fetchHistory = async () => {
    if (!isLoggedIn) {
      setHistory([]);
      return;
    }

    try {
      const res = await api.get("/user/history");
      setHistory(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        setHistory([]);
        return;
      }
      console.error("Error fetching history:", error);
      showToast("Failed to load history", "error");
    }
  };

  const handlePredict = async (url) => {
    // Check if user can scan
    if (!canScan()) {
      showToast('You have reached your free scan limit. Please sign up or log in to continue.', 'info');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    
    try {
      if (!isLoggedIn) {
        const guestResult = await predictAsGuest(url);
        setResult(guestResult);
        incrementScanCount();
        showToast(`URL analyzed successfully. Result: ${guestResult.label}`, guestResult.label === "phishing" ? "warning" : "success");
        return;
      }

      const res = await api.post("/predict", { url });
      setResult(res.data);
      
      // Increment scan count if not logged in
      if (!isLoggedIn) {
        incrementScanCount();
      }
      
      fetchHistory();
      showToast(`URL analyzed successfully. Result: ${res.data.label}`, res.data.label === "phishing" ? "warning" : "success");
    } catch (error) {
      if (error.response?.status === 401 && getRemainingScans() > 0) {
        localStorage.removeItem("token");
        localStorage.removeItem("user_role");
        window.dispatchEvent(new Event("auth-changed"));
        try {
          const guestResult = await predictAsGuest(url);
          setResult(guestResult);
          incrementScanCount();
          showToast(`URL analyzed successfully. Result: ${guestResult.label}`, guestResult.label === "phishing" ? "warning" : "success");
          return;
        } catch (guestError) {
          showToast(guestError.message || "An error occurred during prediction", "error");
          return;
        }
      }
      console.error("Error making prediction:", error);
      showToast(error.response?.data?.detail || error.message || "An error occurred during prediction", "error");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isLoggedIn]);

  return (
    <div className="dashboard-content py-10 max-w-6xl mx-auto px-4">
      <div className="dashboard-header mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 bg-clip-text text-transparent">AI Cybersecurity Platform</h1>
        <p className="text-xl text-cyan-200 max-w-2xl mx-auto">Enter a URL to check if it's legitimate or potentially malicious</p>
      </div>
      
      <div className="url-scanner-card bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 mb-10 shadow-lg shadow-cyan-500/10">
        <UrlForm onPredict={handlePredict} canScan={canScan} getRemainingScans={getRemainingScans} isLoggedIn={isLoggedIn} />
        {!isLoggedIn && (
          <div className="mt-4 p-3 bg-gradient-to-r from-cyan-900/30 to-violet-800/20 backdrop-blur-md rounded-lg border border-cyan-500/30">
            <p className="text-cyan-200 text-lg">Free scans remaining: <span className="font-bold text-cyan-400">{getRemainingScans()}</span></p>
            <p className="text-cyan-300/80 text-sm mt-1">Sign up to unlock unlimited scans</p>
          </div>
        )}
      </div>
      
      {/* Show message after 2 scans */}
      {!isLoggedIn && scanCount >= 2 && (
        <div className="text-center mb-10 p-6 bg-gradient-to-r from-cyan-900/30 to-violet-800/20 backdrop-blur-md rounded-xl border border-cyan-500/30">
          <h2 className="text-2xl font-bold text-cyan-300 mb-4">Thank You for Trying Our Service!</h2>
          <p className="text-xl text-cyan-200 mb-6">For a better experience and unlimited scans, please Sign In.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-violet-700 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/25"
          >
            Sign In
          </button>
        </div>
      )}
      
      <div className="results-section grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <ResultCard result={result} />
        {isLoggedIn ? (
          <HistoryTable history={history} />
        ) : (
          <div className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <h3 className="text-2xl font-bold text-cyan-300 mb-3">History Unlock</h3>
            <p className="text-cyan-200 mb-4">
              Sign in to save scan history and view detailed analytics for past URLs.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-violet-700 transition-all duration-300 shadow-lg shadow-cyan-500/25"
            >
              Sign In to View History
            </button>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
