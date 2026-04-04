import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useScanLimit from '../hooks/useScanLimit';
import FuturisticHero from '../components/FuturisticHero';
import '../App.css';

const LandingPage = () => {
  const { getRemainingScans, isLoggedIn } = useScanLimit();
  const [publicStats, setPublicStats] = useState(null);

  useEffect(() => {
    const fetchPublicStats = async () => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      try {
        const response = await fetch(`${baseUrl}/stats/summary`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setPublicStats(data);
      } catch (error) {
        console.error("Error fetching public stats:", error);
      }
    };

    fetchPublicStats();
  }, []);
  
  return (
    <div className="landing-page">
      <FuturisticHero />
      
      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Advanced Security Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Real-time Protection</h3>
              <p>Continuous monitoring and analysis of URLs to detect threats instantly</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>AI-Powered Detection</h3>
              <p>Machine learning algorithms that evolve to counter new phishing techniques</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Detailed Analytics</h3>
              <p>Comprehensive reports and insights on detected threats and trends</p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Platform Analytics */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Platform-Wide Analytics</h2>
          {publicStats ? (
            <div className="features-grid">
              <div className="feature-card">
                <h3>Total Scans</h3>
                <p className="text-3xl font-bold text-cyan-200 mt-2">{publicStats.total_scans ?? 0}</p>
              </div>
              <div className="feature-card">
                <h3>Phishing Detected</h3>
                <p className="text-3xl font-bold text-cyan-200 mt-2">{publicStats.phishing_scans ?? 0}</p>
              </div>
              <div className="feature-card">
                <h3>Threat Rate</h3>
                <p className="text-3xl font-bold text-cyan-200 mt-2">{((publicStats.phishing_rate ?? 0) * 100).toFixed(1)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-cyan-200 text-lg">
              Platform analytics are currently unavailable.
            </p>
          )}
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Secure Your Digital Assets?</h2>
          <p>Join thousands of organizations protected by our advanced cybersecurity platform</p>
          {!isLoggedIn && (
            <p className="text-xl text-cyan-300 mt-4">
              Get <span className="font-bold text-cyan-400">{getRemainingScans()}</span> free scans before signing up!
            </p>
          )}
          <div className="cta-buttons">
            <Link to="/register" className="btn-primary">Get Started</Link>
            <Link to="/dashboard" className="btn-secondary">Try Demo</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
