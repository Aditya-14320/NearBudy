import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, MessageSquare, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Welcome.css';

const Welcome = () => {
  const { loginAsGuest, loginWithGoogle, currentUser } = useAppContext();
  const navigate = useNavigate();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.onboardingCompleted) {
        navigate('/home');
      } else {
        navigate('/profile-setup');
      }
    }
  }, [currentUser, navigate]);

  const handleGuestLogin = async () => {
    if (loadingGoogle || loadingGuest) return;
    setLoadingGuest(true);
    try {
      await loginAsGuest();
      // Navigation is handled by the useEffect above
    } catch (err) {
      console.error("Guest sign in failed:", err);
      setLoadingGuest(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loadingGoogle || loadingGuest) return;
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
      // Navigation is handled by the useEffect above
    } catch (err) {
      console.error("Google sign in failed:", err);
      setLoadingGoogle(false);
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
            <div className="welcome-logo" style={{ fontSize: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', boxShadow: 'none' }}>🐣</div>
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
            className="primary-signin-btn google-btn" 
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingGuest}
          >
            {loadingGoogle ? (
              <div className="spinner"></div>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <button 
            className="secondary-signin-btn" 
            onClick={handleGuestLogin}
            disabled={loadingGoogle || loadingGuest}
          >
            {loadingGuest ? (
              <div className="spinner"></div>
            ) : (
              <span>Continue as Guest</span>
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
