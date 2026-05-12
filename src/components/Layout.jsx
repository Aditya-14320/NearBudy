import { Outlet, Navigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAppContext } from '../context/AppContext';
import './Layout.css';

const Layout = () => {
  const { currentUser } = useAppContext();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout-container">
      <div className="layout-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
