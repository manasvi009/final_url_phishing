import React from 'react';
import { Link } from 'react-router-dom';
import './FuturisticHero.css';

const FuturisticHero = () => {
  return (
    <div className="futuristic-hero">
      {/* Animated Background Elements */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`}}></div>
        ))}
      </div>
      
      {/* Scan Line Effect */}
      <div className="scan-line"></div>
      
      {/* Main Content */}
      <div className="hero-content">
        {/* Digital Shield */}
        <div className="digital-shield-container">
          <svg className="digital-shield" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ffff" />
                <stop offset="50%" stopColor="#8a2be2" />
                <stop offset="100%" stopColor="#00ffff" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path 
              d="M20,40 C20,20 60,10 100,10 C140,10 180,20 180,40 L180,120 C180,160 140,190 100,190 C60,190 20,160 20,120 Z" 
              fill="url(#shield-gradient)" 
              filter="url(#glow)"
              stroke="#00ffff"
              strokeWidth="2"
            />
            <path 
              d="M100,60 L140,100 L100,140 L60,100 Z" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        </div>
        
        {/* Hero Text */}
        <h1 className="hero-title">
          <span className="gradient-text">AI-Powered Cybersecurity</span>
          <br />
          <span className="subtitle">Protecting Against Phishing Threats</span>
        </h1>
        
        <p className="hero-description">
          Advanced machine learning algorithms detect and neutralize phishing URLs in real-time
        </p>
        
        {/* Call to Action Buttons */}
        <div className="cta-buttons">
          <Link to="/register" className="btn-primary">Start Free Trial</Link>
          <Link to="/dashboard" className="btn-secondary">View Demo</Link>
        </div>
        
        {/* Neural Network Visualization */}
        <div className="neural-network">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="neuron" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            }}></div>
          ))}
          
          {/* Connections between neurons */}
          <div className="neural-connections">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="connection" style={{
                transform: `rotate(${Math.random() * 360}deg)`,
                width: `${20 + Math.random() * 80}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`
              }}></div>
            ))}
          </div>
        </div>
        
        {/* Holographic Dashboard Panels */}
        <div className="dashboard-panels">
          <div className="panel panel-1">
            <div className="panel-header">
              <span>Threat Detection</span>
              <div className="status-indicator active"></div>
            </div>
            <div className="panel-content">
              <div className="metric">99.7%</div>
              <div className="metric-label">Accuracy Rate</div>
            </div>
          </div>
          
          <div className="panel panel-2">
            <div className="panel-header">
              <span>Real-time Analysis</span>
              <div className="status-indicator active"></div>
            </div>
            <div className="panel-content">
              <div className="metric">0.02s</div>
              <div className="metric-label">Avg Response Time</div>
            </div>
          </div>
          
          <div className="panel panel-3">
            <div className="panel-header">
              <span>Active Protection</span>
              <div className="status-indicator active"></div>
            </div>
            <div className="panel-content">
              <div className="metric">24/7</div>
              <div className="metric-label">Monitoring</div>
            </div>
          </div>
        </div>
        
        {/* Floating Code Snippets */}
        <div className="code-snippets">
          {['const detectPhishing = (url) => {', 'if (suspiciousFeatures.includes(feature)) {', 'return { status: "MALICIOUS",', 'confidence: 0.99 }', '// ML Model Processing...', 'const analyzeURL = async (input) => {'].map((snippet, index) => (
            <div 
              key={index} 
              className="code-snippet"
              style={{
                left: `${10 + index * 15}%`,
                top: `${30 + (index % 3) * 20}%`,
                animationDelay: `${index * 0.5}s`
              }}
            >
              {snippet}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FuturisticHero;
