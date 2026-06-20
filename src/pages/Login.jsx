import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, MessageSquare } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { useAppContext } from '../context/AppContext';
import { Capacitor } from '@capacitor/core';
import './Login.css';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Login = () => {
  const { currentUser, loadingAuth } = useAppContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect logged-in users to appropriate pages
  useEffect(() => {
    if (!loadingAuth && currentUser) {
      if (currentUser.username) {
        navigate('/home');
      } else {
        navigate('/profile-setup');
      }
    }
  }, [loadingAuth, currentUser, navigate]);

  if (!loadingAuth && currentUser) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      if (Capacitor.isNativePlatform()) {
        // Native Social Login using @capgo/capacitor-social-login
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        
        await SocialLogin.initialize({
          google: {
            webClientId: '428992181441-cdgreqoutebe328evb4vpnmi9r22hl6n.apps.googleusercontent.com',
          }
        });

        const response = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile']
          }
        });

        if (response.result?.idToken) {
          const credential = GoogleAuthProvider.credential(response.result.idToken);
          await signInWithCredential(auth, credential);
        } else {
          throw new Error('Google Sign-in did not return a valid credentials token.');
        }
      } else {
        // Web Authentication using standard Firebase Sign-in popup
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      console.error("Google Authentication error:", err);
      let friendlyMessage = 'Authentication failed. Please try again.';
      if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in window closed. Please try again.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="map-grid-overlay"></div>

      <div className="login-header animate-slide-up">
        <div className="icon-circle">
          <img src="/app-icon.png" alt="NearBudy Logo" className="login-logo-img" />
        </div>
        <h1 className="brand-name">NearBudy</h1>
        <p className="tagline">Discover students and friends near you.</p>
      </div>

      <div className="hero-container animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="radar-circle">
          <div className="radar-pulse"></div>
        </div>

        <div className="profile-card-preview card-left">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" 
            alt="Sarah" 
            className="profile-avatar-preview" 
          />
          <div className="profile-info-preview">
            <span className="profile-name-preview">
              Sarah, 21 <span className="status-dot-preview"></span>
            </span>
            <span className="profile-dist-preview">150m away</span>
          </div>
        </div>

        <div className="chat-preview-bubble">
          Hey! Up for coffee? ☕
        </div>

        <div className="profile-card-preview card-right">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
            alt="Alex" 
            className="profile-avatar-preview" 
          />
          <div className="profile-info-preview">
            <span className="profile-name-preview">
              Alex, 20 <span className="status-dot-preview"></span>
            </span>
            <span className="profile-dist-preview">320m away</span>
          </div>
        </div>
      </div>

      <div className="social-proof-container animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="social-proof-pill">
          <span className="social-proof-dot"></span>
          1,200+ active students nearby • 15k+ chats exchanged
        </div>
      </div>

      <div className="features-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <Compass size={20} />
          </div>
          <div className="feature-content">
            <h3 className="feature-title">Find nearby people</h3>
            <p className="feature-desc">Discover other students just around the corner in real-time.</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <MessageSquare size={20} />
          </div>
          <div className="feature-content">
            <h3 className="feature-title">Chat instantly</h3>
            <p className="feature-desc">Connect and message with verified campus peers immediately.</p>
          </div>
        </div>
      </div>

      <div className="login-actions animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <button 
          onClick={handleGoogleLogin} 
          className="btn-google"
          disabled={loading}
        >
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </div>

      {error && <span className="error-text animate-shake">{error}</span>}

      <div className="login-footer animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <p>By continuing, you agree to our</p>
        <div className="legal-links">
          <span onClick={() => navigate('/terms')}>Terms & Conditions</span>
          <span className="dot">•</span>
          <span onClick={() => navigate('/privacy')}>Privacy Policy</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
