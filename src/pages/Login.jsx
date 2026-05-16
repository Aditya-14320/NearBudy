import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Globe } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import './Login.css';



const Login = () => {
  const { currentUser, loadingAuth, signInAsGuest, nukeDatabase } = useAppContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Social Login for Web/Native
    const initSocial = async () => {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId: '315806772515-4dhnlk7tqnqej1lcgig7ll9oa6lamuua.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
          },
        });
      } catch (e) {
        console.warn("SocialLogin already initialized or failed:", e);
      }
    };
    initSocial();
  }, []);

  if (!loadingAuth && currentUser) {
    if (currentUser.username) {
      navigate('/home');
    } else {
      navigate('/profile-setup');
    }
    return null;
  }

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      
      // Universal Login Strategy
      let idToken;

      if (Capacitor.isNativePlatform()) {
        // Native Capacitor Google Login
        const googleUser = await SocialLogin.login({ 
          provider: 'google',
          options: {
            scopes: ['profile', 'email'],
          }
        });
        idToken = googleUser.result?.idToken || googleUser.authentication?.idToken;
      } else {
        // Web Firebase Popup Login (Better for localhost/web)
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        idToken = credential?.idToken;
      }
      
      if (!idToken) {
        throw new Error('Google Sign-In failed or was cancelled.');
      }

      // Bridge with Firebase (using the extracted token)
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        navigate('/home');
      } else {
        navigate('/profile-setup');
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-header animate-slide-up">
        <div className="icon-circle">
          <img src="/app-icon.png" alt="NearBudy Logo" className="login-logo-img" />
        </div>
        <h1 className="brand-name">NearBudy</h1>
        <p className="tagline">Social discovery made instant.</p>
      </div>

      <div className="login-actions animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button 
          onClick={handleGoogleSignIn} 
          className="btn-google" 
          disabled={loading}
        >
            <div className="google-icon-wrapper">
              <svg viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            Continue with Google
          </button>
        </div>

        <p className="login-note">
          Guest users can browse nearby, but need an account to chat and post.
        </p>
        
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
