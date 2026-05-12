import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost } from 'lucide-react';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading time, then redirect to login
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

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
