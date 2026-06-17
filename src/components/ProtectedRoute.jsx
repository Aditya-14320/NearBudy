import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loadingAuth, isEmailUnverified } = useAppContext();

  if (loadingAuth) {
    // Show a clean loading state matching splash screen or returning null
    return (
      <div className="splash-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="logo-wrapper animate-pulse">
          <img src="/app-icon.png" alt="NearBudy Logo" className="splash-logo" style={{ width: '80px', height: '80px', borderRadius: '20px' }} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isEmailUnverified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};

export default ProtectedRoute;
