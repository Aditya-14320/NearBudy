import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, MessageSquare, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Welcome.css';

const Welcome = () => {
  const { loginAsGuest } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const user = await loginAsGuest();
      if (user) {
        navigate('/profile-setup');
      }
    } catch (err) {
      console.error("Guest sign in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container animate-fade-in">
      {/* Background ambient glows */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      
      {/* Grid Overlay */}
      <div className="grid-overlay"></div>

      <div className="welcome-content">
        {/* Header Section */}
        <div className="welcome-header animate-slide-up">
          <div className="welcome-logo-container">
            <img src="/app-icon.png" alt="NearBudy Logo" className="welcome-logo" />
            <div className="logo-glow"></div>
          </div>
          <h1 className="welcome-title">NearBudy</h1>
          <p className="welcome-subtitle">Discover students and friends near you.</p>
        </div>

        {/* Visual Showcase Section */}
        <div className="showcase-section animate-slide-up">
          {/* Curved connection line */}
          <svg className="connection-line" viewBox="0 0 300 200" fill="none">
            <path 
              d="M60,65 C120,40 180,160 240,135" 
              stroke="rgba(99, 102, 241, 0.25)" 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
          </svg>

          {/* Sarah Card */}
          <div className="showcase-card sarah-card animate-float-delayed">
            <div className="avatar-container">
              <img src="/avatars/female_1.png" alt="Sarah" className="showcase-avatar" />
            </div>
            <div className="card-info">
              <div className="name-status">
                <span className="card-name">Sarah, 21</span>
                <span className="status-dot online"></span>
              </div>
              <span className="card-distance">150m away</span>
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="speech-bubble animate-pulse-glow">
            <span>Hey! Up for coffee? ☕</span>
          </div>

          {/* Alex Card */}
          <div className="showcase-card alex-card animate-float">
            <div className="avatar-container">
              <img src="/avatars/male_1.png" alt="Alex" className="showcase-avatar" />
            </div>
            <div className="card-info">
              <div className="name-status">
                <span className="card-name">Alex, 20</span>
                <span className="status-dot online"></span>
              </div>
              <span className="card-distance">320m away</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-pill animate-slide-up">
          <span className="stats-dot"></span>
          <span className="stats-text">1,200+ active students nearby • 15k+ chats exchanged</span>
        </div>

        {/* Features List */}
        <div className="features-list animate-slide-up">
          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <Compass size={22} className="feature-icon" />
            </div>
            <div className="feature-details">
              <h3>Find nearby people</h3>
              <p>Discover other students just around the corner in real-time.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <MessageSquare size={22} className="feature-icon" />
            </div>
            <div className="feature-details">
              <h3>Chat instantly</h3>
              <p>Connect and message with verified campus peers immediately.</p>
            </div>
          </div>
        </div>

        {/* Actions & Footer */}
        <div className="welcome-actions animate-slide-up">
          <button 
            className="primary-signin-btn" 
            onClick={handleGuestLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>Continue as Guest</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          <p className="terms-policy-text">
            By continuing, you agree to our <br />
            <Link to="/terms" className="footer-link">Terms & Conditions</Link> • <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
