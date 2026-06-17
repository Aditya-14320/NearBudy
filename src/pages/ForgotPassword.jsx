import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { apiFetch } from '../utils/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  
  // Phone fields
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone, setLocalPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const getFullPhone = () => {
    return countryCode + localPhone.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {};
    if (method === 'email') {
      if (!email) {
        setError('Please enter your email address.');
        return;
      }
      payload.email = email.trim();
    } else {
      if (!localPhone) {
        setError('Please enter your phone number.');
        return;
      }
      payload.phone = getFullPhone();
    }

    setLoading(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccess('Reset code sent! Redirecting...');
      
      const queryParam = method === 'email' 
        ? `email=${encodeURIComponent(email.trim())}` 
        : `phone=${encodeURIComponent(getFullPhone())}`;

      setTimeout(() => {
        navigate(`/reset-password?${queryParam}`);
      }, 1500);
    } catch (err) {
      console.error("Forgot Password Request Error:", err);
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container animate-fade-in">
      <div className="forgot-header animate-slide-up">
        <button className="btn-back-login" onClick={() => navigate('/login')}>
          <ArrowLeft size={16} /> Back to Login
        </button>
        
        <div className="icon-circle-forgot">
          <KeyRound size={32} className="forgot-icon-glow" />
        </div>
        <h1 className="forgot-title">Forgot Password</h1>
        <p className="forgot-tagline">
          Select recovery method to receive a 6-digit verification code.
        </p>
      </div>

      <div className="forgot-body animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {/* Tab Selection */}
        {!success && (
          <div className="auth-method-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`tab-btn ${method === 'email' ? 'active' : ''}`}
              onClick={() => { setMethod('email'); setError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: method === 'email' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                color: method === 'email' ? '#a5b4fc' : '#9ca3af',
                borderColor: method === 'email' ? 'var(--accent-primary)' : 'transparent',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Email
            </button>
            <button
              type="button"
              className={`tab-btn ${method === 'phone' ? 'active' : ''}`}
              onClick={() => { setMethod('phone'); setError(''); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: method === 'phone' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                color: method === 'phone' ? '#a5b4fc' : '#9ca3af',
                borderColor: method === 'phone' ? 'var(--accent-primary)' : 'transparent',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Phone Number
            </button>
          </div>
        )}

        {success ? (
          <div className="success-message-box animate-fade-in">
            <p className="success-text">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-form">
            {method === 'email' ? (
              <div className="input-field-forgot">
                <Mail size={18} className="field-icon-forgot" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="input-field-forgot has-select">
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
            )}

            {error && <span className="error-text animate-shake" style={{ display: 'block', color: 'var(--danger)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{error}</span>}

            <button type="submit" className="btn-forgot-submit" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
