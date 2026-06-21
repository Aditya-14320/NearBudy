import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { Capacitor } from '@capacitor/core';
import './UpgradeAccountModal.css';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const UpgradeAccountModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, upgradeAccount } = useAppContext();
  const [activeTab, setActiveTab] = useState(null); // null, 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLinkGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const { GoogleAuthProvider, linkWithPopup, linkWithCredential } = await import('firebase/auth');
      
      let credential = null;
      if (Capacitor.isNativePlatform()) {
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '428992181441-cdgreqoutebe328evb4vpnmi9r22hl6n.apps.googleusercontent.com';
        
        await SocialLogin.initialize({
          google: { webClientId: googleClientId }
        });

        const response = await SocialLogin.login({
          provider: 'google',
          options: { scopes: ['email', 'profile'] }
        });

        if (response.result?.idToken) {
          credential = GoogleAuthProvider.credential(response.result.idToken);
        } else {
          throw new Error('Google Sign-in did not return a valid credentials token.');
        }
      } else {
        const provider = new GoogleAuthProvider();
        await linkWithPopup(auth.currentUser, provider);
      }

      if (credential) {
        await upgradeAccount(credential);
      } else if (!Capacitor.isNativePlatform()) {
        // Web linkWithPopup updates in-place. Update Firestore:
        const user = auth.currentUser;
        await updateDoc(doc(db, "users", user.uid), {
          isGuest: false,
          name: user.displayName || currentUser.name,
          avatar: user.photoURL || currentUser.avatar
        });
        setCurrentUser(prev => ({ ...prev, isGuest: false, name: user.displayName || prev.name, avatar: user.photoURL || prev.avatar }));
      }
      
      alert('Guest account successfully linked to Google! Your data is safe. 🎉');
      onClose();
    } catch (err) {
      console.error(err);
      let friendlyMessage = 'Linking failed. Please try again.';
      if (err.code === 'auth/credential-already-in-use') {
        friendlyMessage = 'This Google account is already linked to another user.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { EmailAuthProvider } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(email, password);
      
      const success = await upgradeAccount(credential);
      if (success) {
        alert('Guest account successfully linked to Email! Your data is safe. 🎉');
        onClose();
      } else {
        throw new Error('Linking failed. Make sure the email is not already in use.');
      }
    } catch (err) {
      console.error(err);
      let friendlyMessage = 'Linking failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use by another account.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="upgrade-modal-card glass-morphism animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="upgrade-modal-header">
          <div className="sparkle-title">
            <Sparkles size={20} className="header-sparkle-icon animate-pulse" />
            <h2>Save Your Account</h2>
          </div>
          <button className="upgrade-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="upgrade-modal-subtitle">
          Link your temporary guest session to a permanent account to keep your profile, location history, and chats safe.
        </p>

        {error && (
          <div className="upgrade-error-box animate-shake">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === null ? (
          <div className="upgrade-options-grid">
            <button className="btn-link-google-modal" onClick={handleLinkGoogle} disabled={loading}>
              {loading ? (
                <div className="upgrade-spinner"></div>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Link Google Account</span>
                </>
              )}
            </button>

            <button className="btn-link-email-modal" onClick={() => setActiveTab('email')} disabled={loading}>
              <Mail size={20} />
              <span>Link Email Address</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleLinkEmail} className="upgrade-email-form animate-fade-in">
            <div className="upgrade-input-wrapper">
              <Mail className="upgrade-input-icon" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="upgrade-input-wrapper">
              <Lock className="upgrade-input-icon" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="upgrade-password-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="upgrade-form-actions">
              <button 
                type="button" 
                className="btn-upgrade-back" 
                onClick={() => { setActiveTab(null); setError(''); }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn-upgrade-submit" disabled={loading}>
                {loading ? <div className="upgrade-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }}></div> : 'Save Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UpgradeAccountModal;
