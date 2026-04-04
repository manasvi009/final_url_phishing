import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="py-10 max-w-6xl mx-auto px-4">
      <section className="bg-gray-900/50 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 mb-8 shadow-lg shadow-cyan-500/10">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 bg-clip-text text-transparent">
          About CyberShield Pro
        </h1>
        <p className="text-cyan-200 text-lg leading-relaxed">
          CyberShield Pro helps users detect phishing URLs in real-time using machine learning.
          The platform is built for fast URL checks, transparent risk scoring, and continuous
          security monitoring.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-semibold text-cyan-300 mb-2">What We Detect</h2>
          <p className="text-cyan-200/90">
            Suspicious URL patterns, risky domain signals, and behavior linked to phishing attacks.
          </p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-semibold text-cyan-300 mb-2">How It Helps</h2>
          <p className="text-cyan-200/90">
            Reduces the chance of credential theft by identifying malicious links before users click.
          </p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <h2 className="text-xl font-semibold text-cyan-300 mb-2">Who Uses It</h2>
          <p className="text-cyan-200/90">
            Individuals, security teams, and organizations that need quick and reliable URL screening.
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-r from-cyan-900/30 to-violet-800/20 backdrop-blur-md p-8 rounded-xl border border-cyan-500/30 text-center">
        <h2 className="text-2xl font-bold text-cyan-200 mb-3">Start Scanning Now</h2>
        <p className="text-cyan-300 mb-6">Check suspicious URLs and protect your users from phishing threats.</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary">Create Account</Link>
          <Link to="/dashboard" className="btn-secondary">Open Dashboard</Link>
        </div>
      </section>
    </div>
  );
}
