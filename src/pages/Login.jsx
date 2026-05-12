import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import './Login.css';

const Login = () => {
  const { currentUser, loadingAuth } = useAppContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  // If already logged in, go home
  if (!loadingAuth && currentUser) {
    navigate('/home');
    return null;
  }



  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
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

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        // New user, go to profile setup
        navigate('/profile-setup');
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Check for Firestore profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          navigate('/home');
        } else {
          navigate('/profile-setup');
        }
      }
    } catch (err) {
      console.error("Email Auth Error:", err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email. Try signing up!';
      if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already in use. Try signing in!';
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-header animate-slide-up">
        <div className="icon-circle">
          <GraduationCap size={40} className="header-icon" />
        </div>
        <h2>Welcome to NearBudy</h2>
        <p>Your private campus network.</p>
      </div>

      <div className="login-form animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button 
          onClick={handleGoogleSignIn} 
          className="btn-outline" 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <p className="toggle-auth-text" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </p>
        
        {error && <span className="error-text" style={{ marginTop: '16px', display: 'block', textAlign: 'center' }}>{error}</span>}
      </div>
    </div>
  );
};

export default Login;
