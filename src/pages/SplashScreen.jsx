import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { currentUser, loadingAuth } = useAppContext();

  useEffect(() => {
    if (!loadingAuth) {
      const timer = setTimeout(() => {
        if (currentUser) {
          navigate('/home');
        } else {
          navigate('/login');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loadingAuth, currentUser, navigate]);

  return (
    <div className="splash-container animate-fade-in">
      <div className="logo-wrapper animate-pulse">
        <Ghost size={64} className="logo-icon" />
      </div>
      <h1 className="app-title">NearBudy</h1>
      <p className="app-subtitle">Campus Only.</p>
    </div>
  );
};

export default SplashScreen;
