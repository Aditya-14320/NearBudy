import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ProtectedRoute = ({ children, allowOnboarding = false }) => {
  const { currentUser, loadingAuth } = useAppContext();

  if (loadingAuth) {
    // Show a clean loading state matching splash screen or returning null
    return (
      <div className="splash-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="logo-wrapper animate-pulse">
          <div className="splash-logo" style={{ fontSize: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', background: 'transparent', border: 'none', boxShadow: 'none' }}>🐣</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/welcome" replace />;
  }

  if (!currentUser.onboardingCompleted && !allowOnboarding) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
};

export default ProtectedRoute;
