import { NavLink } from 'react-router-dom';
import { Home as HomeIcon, Map, MessageCircle, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './BottomNav.css';

const BottomNav = () => {
  const { chats, currentUser } = useAppContext();
  const unreadCount = chats?.reduce((acc, chat) => acc + (chat.unreadCount?.[currentUser?.id] || 0), 0) || 0;

  return (
    <nav className="bottom-nav">
      <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <HomeIcon size={26} strokeWidth={1.5} />
        <span>Home</span>
      </NavLink>
      
      <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Map size={26} strokeWidth={1.5} />
        <span>Map</span>
      </NavLink>

      <NavLink to="/chats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} notif-tab`}>
        <MessageCircle size={26} strokeWidth={1.5} />
        <span>Chats</span>
        {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </NavLink>
      
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={26} strokeWidth={1.5} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
