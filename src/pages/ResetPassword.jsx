import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import './ResetPassword.css';

const ResetPassword = () => {
  const [email] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('email') || '';
  });
  const [phone] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('phone') || '';
  });

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // Redirect back to forgot-password if both email and phone are missing
  useEffect(() => {
    if (!email && !phone) {
      navigate('/forgot-password');
    }
  }, [email, phone, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (otp.length < 6) {
      setError('Verification code must be 6 digits.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        otp: otp.trim(),
        newPassword: newPassword
      };

      if (phone) {
        payload.phone = phone.trim();
      } else {
        payload.email = email.trim();
      }

      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccess('Password reset successful! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackNavigation = () => {
    const query = phone 
      ? `phone=${encodeURIComponent(phone)}` 
      : `email=${encodeURIComponent(email)}`;
    navigate(`/forgot-password?${query}`);
  };

  return (
    <div className="reset-container animate-fade-in">
      <div className="reset-header animate-slide-up">
        <button className="btn-back-forgot" onClick={handleBackNavigation}>
          <ArrowLeft size={16} /> Back
        </button>
        
        <div className="icon-circle-reset">
          <Lock size={32} className="reset-icon-glow" />
        </div>
        <h1 className="reset-title">Reset Password</h1>
        <p className="reset-tagline">
          Enter the code sent to <span className="email-span">{phone || email}</span> and choose a new password.
        </p>
      </div>

      <div className="reset-body animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {success ? (
          <div className="success-overlay-reset animate-fade-in">
            <CheckCircle size={48} className="success-icon-pulse-reset" />
            <p className="success-text-message-reset">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reset-form">
            <div className="input-field-reset">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                placeholder="6-digit Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                required
                disabled={loading}
                className="otp-code-input"
              />
            </div>

            <div className="input-field-reset">
              <Lock size={18} className="field-icon-reset" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-reset"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="input-field-reset">
              <Lock size={18} className="field-icon-reset" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-reset"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <span className="error-text animate-shake">{error}</span>}

            <button type="submit" className="btn-reset-submit" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
