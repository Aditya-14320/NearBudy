import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, RotateCw, LogOut, CheckCircle } from 'lucide-react';
import { auth } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const { firebaseUser, isEmailUnverified, reloadAuthUser } = useAppContext();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(30); // Initialize directly to 30s cooldown
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Single stable ref for holding inputs
  const inputRefs = useRef([]);

  const navigate = useNavigate();
  const email = firebaseUser?.email || '';

  // Redirect to app if email is already verified
  useEffect(() => {
    if (firebaseUser && !isEmailUnverified) {
      navigate('/home');
    }
  }, [firebaseUser, isEmailUnverified, navigate]);

  // Send OTP on mount if user logged in instead of signing up
  useEffect(() => {
    if (!email) return;

    const sentRecently = sessionStorage.getItem('otp_sent_recently');
    if (!sentRecently) {
      apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          type: 'signup'
        })
      }).catch(err => {
        console.error("Auto-send OTP on mount failed:", err);
      });
    } else {
      sessionStorage.removeItem('otp_sent_recently');
    }
  }, [email]);

  // Handle cooldown timer countdown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (index, value) => {
    const newVal = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = newVal;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (newVal !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = useCallback(async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          otp: otpCode
        })
      });

      setSuccess('Email verified successfully!');
      
      // Reload current Firebase user authentication status
      setTimeout(async () => {
        try {
          await reloadAuthUser();
          navigate('/profile-setup');
        } catch (reloadErr) {
          console.error("Auth reload failed:", reloadErr);
          navigate('/login');
        }
      }, 1500);
    } catch (err) {
      console.error("OTP Verification Error:", err);
      setError(err.message || 'Incorrect verification code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, otp, navigate, reloadAuthUser]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setError('');
    setSuccess('');
    setResending(true);

    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          type: 'signup'
        })
      });
      setSuccess('Verification code resent successfully.');
      setCooldown(30);
    } catch (err) {
      console.error("Resend OTP Error:", err);
      setError(err.message || 'Failed to send new code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Trigger verify automatically when 6th digit is filled
  useEffect(() => {
    if (otp.join('').length === 6 && !loading) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [otp, loading, handleVerify]);

  return (
    <div className="verify-container animate-fade-in">
      <div className="verify-header animate-slide-up">
        <button className="btn-signout" onClick={handleSignOut}>
          <LogOut size={16} /> Log Out
        </button>
        <div className="icon-circle-verify">
          <Mail size={32} className="mail-icon-glow" />
        </div>
        <h1 className="verify-title">Verify Email</h1>
        <p className="verify-tagline">
          We sent a 6-digit verification code to <br />
          <strong className="email-highlight">{email}</strong>
        </p>
      </div>

      <div className="verify-body animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {success ? (
          <div className="success-overlay animate-fade-in">
            <CheckCircle size={48} className="success-icon-pulse" />
            <p className="success-text-message">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="otp-form">
            <div className="otp-inputs" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={loading}
                  className={digit !== '' ? 'filled' : ''}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {error && <span className="error-text animate-shake">{error}</span>}

            <button
              type="submit"
              className="btn-verify-submit"
              disabled={loading || otp.join('').length < 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        <div className="resend-section">
          <p className="resend-text">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            className={`btn-resend ${cooldown > 0 ? 'cooldown-active' : ''}`}
            disabled={cooldown > 0 || resending}
          >
            {resending ? (
              <RotateCw size={14} className="spin-icon" />
            ) : null}
            {cooldown > 0
              ? `Resend Code in ${cooldown}s`
              : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
