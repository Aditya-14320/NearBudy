import { useState } from 'react';
import { Flame, Bell, Search, Map, Sparkles, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import PremiumModal from '../components/PremiumModal';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { nearbyUsers, currentUser, requests, notifications } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Exclude self and sort nearby
  const suggestions = nearbyUsers.filter(u => u.id !== currentUser?.id);
  const unreadNotifs = notifications?.filter(n => !n.read).length || 0;
  const totalAlerts = (requests?.length || 0) + unreadNotifs;

  // Search logic
  const displayUsers = searchQuery.trim() 
    ? suggestions.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.profession && u.profession.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : suggestions;

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="home-container">
      <div className="home-header-new">
        <div className="logo-title">
          <div className="logo-box">
            <Flame size={20} strokeWidth={1.5} color="white" fill="white" />
          </div>
          <h2>Nearby</h2>
        </div>
        <button className="icon-btn-transparent" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
          <Bell size={24} strokeWidth={1.5} />
          {totalAlerts > 0 && <span className="nav-dot" style={{ top: 2, right: 2 }}></span>}
        </button>
      </div>

      <div className="home-content-new">
        <div className="greeting-section">
          <p className="hey-text">Hey {currentUser?.name?.split(' ')[0] || 'adi'} 👋</p>
          <h1 className="discover-text">Discover people around <span className="text-muted">you</span></h1>
        </div>

        <div className="search-bar-new">
          <Search size={20} strokeWidth={1.5} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search students by name or college" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="map-banner-card" onClick={() => navigate('/map')}>
          <div className="banner-icon-box">
            <Map size={24} strokeWidth={1.5} color="#38bdf8" />
          </div>
          <div className="banner-text">
            <h3>See who's nearby</h3>
            <p>Open the live map</p>
          </div>
          <Sparkles size={24} strokeWidth={1.5} className="banner-sparkle" />
        </div>

        <div className="action-cards-row">
          <div className="action-card outline-card" onClick={() => setIsPremiumModalOpen(true)}>
            <div className="action-icon-bg boost-bg">
              <Zap size={20} strokeWidth={1.5} color="white" fill="white" />
            </div>
            <div className="action-text">
              <h4>Boost</h4>
              <p>10x views • ₹19</p>
            </div>
          </div>
          <div className="action-card outline-card" onClick={() => setIsPremiumModalOpen(true)}>
            <div className="action-icon-bg pro-bg">
              <Crown size={20} strokeWidth={1.5} color="white" />
            </div>
            <div className="action-text">
              <h4>Go Pro</h4>
              <p>From ₹29/wk</p>
            </div>
          </div>
        </div>

        <div className="suggested-section-new">
          <div className="section-header">
            <h3>{searchQuery.trim() ? 'Search Results' : 'Suggested for you'}</h3>
            {!searchQuery.trim() && <button className="see-all-btn">See all</button>}
          </div>
          
          <div className="suggested-cards-scroll">
            {displayUsers.map(user => (
              <div key={user.id} className="large-suggested-card" onClick={() => handleUserClick(user)}>
                <img src={user.avatar} alt={user.name} />
                <div className="card-overlay">
                  <h4>{user.isLocked && !currentUser?.isPremium ? "Hidden" : `${user.name}, ${user.age || 21}`}</h4>
                </div>
              </div>
            ))}
            {displayUsers.length === 0 && (
              <p style={{ color: '#a1a1aa', fontSize: 14 }}>No users found.</p>
            )}
          </div>
        </div>
      </div>

      <ProfilePreviewModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onPaymentSuccess={() => {}}
      />
    </div>
  );
};

export default Home;
