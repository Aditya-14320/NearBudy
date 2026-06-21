import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, MessageSquare, Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
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
  const [view, setView] = useState('options'); // 'options' or 'email'
  const [emailMode, setEmailMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect logged-in users to appropriate pages
  useEffect(() => {
    if (!loadingAuth && currentUser) {
      if (currentUser.onboardingCompleted) {
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
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '428992181441-cdgreqoutebe328evb4vpnmi9r22hl6n.apps.googleusercontent.com';
        
        await SocialLogin.initialize({
          google: {
            webClientId: googleClientId,
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

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setResetSent(false);
    setLoading(true);

    try {
      if (emailMode === 'login') {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Email Authentication error:", err);
      let friendlyMessage = 'Authentication failed. Please try again.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      let friendlyMessage = 'Failed to send password reset email.';
      if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No user found with this email address.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Anonymous Sign-in error:", err);
      setError(err.message || 'Failed to sign in as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'email') {
    return (
      <div className="login-container animate-fade-in">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="map-grid-overlay"></div>

        <div className="form-container-wrapper animate-slide-up">
          <button onClick={() => { setView('options'); setError(''); setResetSent(false); }} className="btn-back-link">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="form-header-row">
            <h2 className="form-title">
              {emailMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="form-subtitle">
              {emailMode === 'login' 
                ? 'Sign in to connect with nearby friends.' 
                : 'Join NearBudy and discover students around you.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="form-body">
            <div className="modern-input-field">
              <Mail className="input-icon-left" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="modern-input-field">
              <Lock className="input-icon-left" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="input-action-right"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {emailMode === 'login' && (
              <span onClick={handleForgotPassword} className="forgot-password-link-new">
                Forgot Password?
              </span>
            )}

            <button type="submit" className="btn-auth-submit-new" disabled={loading}>
              {loading ? (
                <div className="loading-spinner" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', borderTopColor: '#ffffff', margin: '0 auto' }}></div>
              ) : (
                <span>{emailMode === 'login' ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </form>

          <div className="auth-mode-toggle">
            {emailMode === 'login' ? (
              <>
                Don't have an account? <span onClick={() => { setEmailMode('register'); setError(''); setResetSent(false); }}>Sign Up</span>
              </>
            ) : (
              <>
                Already have an account? <span onClick={() => { setEmailMode('login'); setError(''); setResetSent(false); }}>Sign In</span>
              </>
            )}
          </div>
          
          {resetSent && <span className="error-text" style={{ color: 'var(--success)' }}>Password reset email sent successfully!</span>}
          {error && <span className="error-text animate-shake">{error}</span>}
        </div>
      </div>
    );
  }

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

        <button 
          onClick={() => { setView('email'); setError(''); setResetSent(false); }} 
          className="btn-email"
          disabled={loading}
        >
          <Mail size={20} style={{ flexShrink: 0 }} />
          <span>Continue with Email</span>
        </button>

        <button 
          onClick={handleAnonymousLogin} 
          className="btn-guest"
          disabled={loading}
        >
          <User size={20} style={{ flexShrink: 0 }} />
          <span>Browse as Guest</span>
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
