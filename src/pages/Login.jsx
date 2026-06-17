import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Compass, MessageSquare, Phone, RotateCw } from 'lucide-react';
import { auth } from '../firebase';
import { 
  setPersistence, 
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { useAppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import './Login.css';

const Login = () => {
  const { currentUser, loadingAuth, isEmailUnverified } = useAppContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Auth Mode and Method
  const [showEmailForm, setShowEmailForm] = useState(false); // Toggle to show form panel
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone-specific fields (default India +91)
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone, setLocalPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState('input'); // 'input' | 'verify'
  const [phoneOtp, setPhoneOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // Helper to get full E.164 international phone number
  const getFullPhone = () => {
    return countryCode + localPhone.trim();
  };

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect logged-in users to appropriate pages
  useEffect(() => {
    if (!loadingAuth && currentUser) {
      if (isEmailUnverified) {
        navigate('/verify-email');
      } else if (currentUser.username) {
        navigate('/home');
      } else {
        navigate('/profile-setup');
      }
    }
  }, [loadingAuth, currentUser, isEmailUnverified, navigate]);

  if (!loadingAuth && currentUser) {
    return null;
  }

  // Handle send OTP for phone signup
  const handleSendPhoneSignupOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!localPhone) {
      setError('Please enter your phone number.');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: fullPhone,
          type: 'signup'
        })
      });
      setPhoneStep('verify');
      setCooldown(30);
    } catch (err) {
      console.error("Phone OTP send error:", err);
      setError(err.message || 'Failed to send OTP code. Please check your phone number and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resending phone signup OTP
  const handleResendPhoneOtp = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setResending(true);

    const fullPhone = getFullPhone();
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: fullPhone,
          type: 'signup'
        })
      });
      setCooldown(30);
    } catch (err) {
      console.error("Resend Phone OTP Error:", err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Handle phone verification + signup submit
  const handlePhoneSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneOtp || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (phoneOtp.length < 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const fullPhone = getFullPhone();
    setLoading(true);

    try {
      // 1. Verify and register user on server
      await apiFetch('/auth/register-phone', {
        method: 'POST',
        body: JSON.stringify({
          phone: fullPhone,
          otp: phoneOtp.trim(),
          password: password
        })
      });

      // 2. Automatically log in user after creation
      await setPersistence(auth, browserLocalPersistence);
      const phoneEmail = `${fullPhone}@phone.nearbudy.local`;
      await signInWithEmailAndPassword(auth, phoneEmail, password);
    } catch (err) {
      console.error("Phone Registration Error:", err);
      setError(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle normal signin/signup via email, or signin via phone
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authMethod === 'email') {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }

      if (authMode === 'signup' && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      setLoading(true);

      try {
        await setPersistence(auth, browserLocalPersistence);

        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } else {
          // Sign up email user
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          try {
            await apiFetch('/auth/send-otp', {
              method: 'POST',
              body: JSON.stringify({
                email: email.trim(),
                type: 'signup'
              })
            });
            sessionStorage.setItem('otp_sent_recently', 'true');
            navigate('/verify-email');
          } catch (apiErr) {
            console.error("Error sending OTP during signup:", apiErr);
            setError(`Account created, but we couldn't send verification email: ${apiErr.message}`);
          }
        }
      } catch (err) {
        console.error("Email Auth Error:", err);
        let friendlyMessage = 'Authentication failed. Please try again.';
        if (err.code === 'auth/invalid-email') friendlyMessage = 'Invalid email address format.';
        else if (err.code === 'auth/user-disabled') friendlyMessage = 'This account has been disabled.';
        else if (err.code === 'auth/user-not-found') friendlyMessage = 'No account exists with this email.';
        else if (err.code === 'auth/wrong-password') friendlyMessage = 'Incorrect password.';
        else if (err.code === 'auth/email-already-in-use') friendlyMessage = 'An account with this email already exists.';
        
        setError(friendlyMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone Login (authMode === 'login' and authMethod === 'phone')
      if (!localPhone || !password) {
        setError('Please enter your phone number and password.');
        return;
      }

      const fullPhone = getFullPhone();
      setLoading(true);

      try {
        await setPersistence(auth, browserLocalPersistence);
        const phoneEmail = `${fullPhone}@phone.nearbudy.local`;
        await signInWithEmailAndPassword(auth, phoneEmail, password);
      } catch (err) {
        console.error("Phone Login Error:", err);
        let friendlyMessage = 'Authentication failed. Please check your phone number and password.';
        if (err.code === 'auth/user-not-found') friendlyMessage = 'No account exists with this phone number.';
        else if (err.code === 'auth/wrong-password') friendlyMessage = 'Incorrect password.';
        
        setError(friendlyMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  // Reset form states when toggling views
  const resetFormState = () => {
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCountryCode('+91');
    setLocalPhone('');
    setPhoneOtp('');
    setPhoneStep('input');
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="map-grid-overlay"></div>

      {!showEmailForm ? (
        <>
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
              onClick={() => { setShowEmailForm(true); setAuthMethod('email'); setAuthMode('login'); resetFormState(); }} 
              className="btn-primary-gradient"
              disabled={loading}
            >
              Get Started
            </button>
          </div>
        </>
      ) : (
        <div className="form-container-wrapper animate-slide-up">
          {/* Back button */}
          <button 
            type="button" 
            className="btn-back-link" 
            onClick={() => { 
              if (authMethod === 'phone' && authMode === 'signup' && phoneStep === 'verify') {
                setPhoneStep('input');
                setError('');
              } else {
                setShowEmailForm(false); 
                setError('');
              }
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="form-header-row">
            <h2 className="form-title">
              {authMode === 'login' ? 'Welcome Back' : (authMethod === 'phone' && phoneStep === 'verify' ? 'Verify OTP' : 'Create Account')}
            </h2>
            <p className="form-subtitle">
              {authMode === 'login' 
                ? 'Your friends are waiting nearby.' 
                : (authMethod === 'phone' && phoneStep === 'verify' ? `Enter the code sent to ${getFullPhone()}` : 'Register and verify to join your campus network.')}
            </p>
          </div>

          {/* Login Tabs Toggle (only show in input modes) */}
          {(authMode === 'login' || (authMethod === 'phone' && phoneStep === 'input') || authMethod === 'email') && (
            <div className="auth-method-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                type="button"
                className={`tab-btn ${authMethod === 'email' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('email'); resetFormState(); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: authMethod === 'email' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: authMethod === 'email' ? '#a5b4fc' : '#9ca3af',
                  borderColor: authMethod === 'email' ? 'var(--accent-primary)' : 'transparent',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Email
              </button>
              <button
                type="button"
                className={`tab-btn ${authMethod === 'phone' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('phone'); resetFormState(); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: authMethod === 'phone' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: authMethod === 'phone' ? '#a5b4fc' : '#9ca3af',
                  borderColor: authMethod === 'phone' ? 'var(--accent-primary)' : 'transparent',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Phone
              </button>
            </div>
          )}

          {/* Form Content */}
          {authMethod === 'email' ? (
            /* Email Login/Signup Form */
            <form onSubmit={handleAuthSubmit} className="form-body">
              <div className="modern-input-field">
                <Mail size={18} className="input-icon-left" />
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="modern-input-field">
                <Lock size={18} className="input-icon-left" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="input-action-right"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {authMode === 'signup' && (
                <div className="modern-input-field animate-fade-in">
                  <Lock size={18} className="input-icon-left" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="input-action-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {authMode === 'login' && (
                <span 
                  className="forgot-password-link-new"
                  onClick={() => navigate(`/forgot-password?email=${encodeURIComponent(email)}`)}
                >
                  Forgot Password?
                </span>
              )}

              <button type="submit" className="btn-auth-submit-new" disabled={loading}>
                {loading 
                  ? (authMode === 'login' ? 'Signing in...' : 'Creating account...') 
                  : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
              </button>

              <p className="auth-mode-toggle">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); resetFormState(); }}>
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </form>
          ) : (
            /* Phone Auth Form */
            authMode === 'login' ? (
              /* Phone Login */
              <form onSubmit={handleAuthSubmit} className="form-body">
                <div className="modern-input-field has-select">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="country-select"
                    disabled={loading}
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+33">🇫🇷 +33</option>
                  </select>
                  <input 
                    type="tel" 
                    placeholder="Phone number" 
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="modern-input-field">
                  <Lock size={18} className="input-icon-left" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="input-action-right"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <span 
                  className="forgot-password-link-new"
                  onClick={() => navigate(`/forgot-password?phone=${encodeURIComponent(getFullPhone())}`)}
                >
                  Forgot Password?
                </span>

                <button type="submit" className="btn-auth-submit-new" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <p className="auth-mode-toggle">
                  Don't have an account?{' '}
                  <span onClick={() => { setAuthMode('signup'); resetFormState(); }}>
                    Sign Up
                  </span>
                </p>
              </form>
            ) : (
              /* Phone Sign Up (Step-based flow) */
              phoneStep === 'input' ? (
                /* Step 1: Input Phone Number */
                <form onSubmit={handleSendPhoneSignupOtp} className="form-body">
                  <div className="modern-input-field has-select">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="country-select"
                      disabled={loading}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                    </select>
                    <input 
                      type="tel" 
                      placeholder="Phone number" 
                      value={localPhone}
                      onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="btn-auth-submit-new" disabled={loading}>
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                  </button>

                  <p className="auth-mode-toggle">
                    Already have an account?{' '}
                    <span onClick={() => { setAuthMode('login'); resetFormState(); }}>
                      Sign In
                    </span>
                  </p>
                </form>
              ) : (
                /* Step 2: Verify OTP & Enter Password */
                <form onSubmit={handlePhoneSignupSubmit} className="form-body">
                  <div className="modern-input-field">
                    <Lock size={18} className="input-icon-left" />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="6"
                      placeholder="6-digit Verification Code" 
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="modern-input-field">
                    <Lock size={18} className="input-icon-left" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Create Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="input-action-right"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="modern-input-field">
                    <Lock size={18} className="input-icon-left" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm Password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="input-action-right"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <button type="submit" className="btn-auth-submit-new" disabled={loading}>
                    {loading ? 'Completing Sign Up...' : 'Complete Sign Up'}
                  </button>

                  <div className="resend-section" style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleResendPhoneOtp}
                      className="btn-resend"
                      disabled={cooldown > 0 || resending}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: cooldown > 0 ? 'var(--text-tertiary)' : 'var(--accent-primary)',
                        cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      {resending && <RotateCw size={12} className="spin-icon" style={{ marginRight: '4px' }} />}
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )
            )
          )}
        </div>
      )}

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
