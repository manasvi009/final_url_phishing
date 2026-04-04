import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import History from "./pages/History";
import AdminPanel from "./pages/AdminPanel";
import Footer from "./components/Footer";
import api from "./api/api";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("user_role") || "user");
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      api.get("/me")
        .then((res) => {
          const role = res.data?.role || "user";
          localStorage.setItem("user_role", role);
          window.dispatchEvent(new Event("auth-changed"));
          setUserRole(role);
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user_role");
          window.dispatchEvent(new Event("auth-changed"));
          setIsLoggedIn(false);
          setUserRole("user");
        });
    } else {
      setUserRole("user");
    }
  }, [isLoggedIn]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    window.dispatchEvent(new Event("auth-changed"));
    setIsLoggedIn(false);
    setUserRole("user");
  };
  const canAccessAnalytics = ["analyst", "admin", "super_admin"].includes(userRole);
  const canAccessAdmin = ["admin", "super_admin"].includes(userRole);
  
  return (
    <Router>
      <div className="App">
        <nav className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-xl">🛡️ CyberShield Pro</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Link to="/" className="hover:text-cyan-300 transition-colors">Home</Link>
                <Link to="/dashboard" className="hover:text-cyan-300 transition-colors">Dashboard</Link>
                {canAccessAnalytics && (
                  <Link to="/analytics" className="hover:text-cyan-300 transition-colors">Analytics</Link>
                )}
                <Link to="/history" className="hover:text-cyan-300 transition-colors">History</Link>
                <Link to="/about" className="hover:text-cyan-300 transition-colors">About</Link>
                {canAccessAdmin && (
                  <Link to="/admin/overview" className="hover:text-cyan-300 transition-colors bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-1 rounded-lg">Admin Panel</Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-700 hover:to-violet-700 px-4 py-2 rounded transition-all duration-300 shadow-lg shadow-cyan-500/25"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/" className="hover:text-cyan-300 transition-colors">Home</Link>
                <Link to="/dashboard" className="hover:text-cyan-300 transition-colors">Try Demo</Link>
                <Link to="/login" className="hover:text-cyan-300 transition-colors">Login</Link>
                <Link to="/register" className="hover:text-cyan-300 transition-colors">Register</Link>
                <Link to="/about" className="hover:text-cyan-300 transition-colors">About</Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/analytics" element={isLoggedIn && canAccessAnalytics ? <Analytics /> : <Navigate to={isLoggedIn ? "/dashboard" : "/login"} />} />
          <Route path="/history" element={isLoggedIn ? <History /> : <Navigate to="/login" />} />
          <Route path="/settings" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />} />
          <Route path="/admin/*" element={isLoggedIn && canAccessAdmin ? <AdminPanel /> : <Navigate to="/admin/login" />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={!isLoggedIn ? <Login setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/" />} />
          <Route path="/admin/login" element={!isLoggedIn ? <Login setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/admin/overview" />} />
          <Route path="/register" element={!isLoggedIn ? <Register setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/" />} />
        </Routes>
        
        <Footer />
      </div>
    </Router>
  );
}
