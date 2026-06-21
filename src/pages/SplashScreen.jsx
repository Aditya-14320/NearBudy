import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { currentUser, loadingAuth } = useAppContext();

  useEffect(() => {
    if (!loadingAuth) {
      if (currentUser) {
        if (currentUser.onboardingCompleted) {
          navigate('/home');
        } else {
          navigate('/profile-setup');
        }
      } else {
        navigate('/login');
      }
    }
  }, [loadingAuth, currentUser, navigate]);

  return (
    <div className="splash-container animate-fade-in">
      <div className="logo-wrapper animate-pulse">
        <img src="/app-icon.png" alt="NearBudy Logo" className="splash-logo" />
      </div>
      <h1 className="app-title">NearBudy</h1>
      <p className="app-subtitle">Connect Nearby.</p>
    </div>
  );
};

export default SplashScreen;
