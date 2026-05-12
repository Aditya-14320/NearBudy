import { useState, useMemo, useEffect } from 'react';
import { Flame, Bell, Search, Map, Sparkles, Zap, Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import PremiumModal from '../components/PremiumModal';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { 
    nearbyUsers, 
    currentUser, 
    requests, 
    notifications, 
    chats, 
    sentRequests,
    sessionViews,
    markAsViewed,
    skippedUsers,
    markAsSkipped
  } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-rotate logic: Mark top users as viewed every minute to rotate the feed
  useEffect(() => {
    if (displayUsers.length <= 3) return;
    
    const interval = setInterval(() => {
      // Mark top 2 users as viewed so they move down in the next shuffle
      const topIds = displayUsers.slice(0, 2).map(u => u.id);
      topIds.forEach(id => markAsViewed(id));
      setRefreshKey(prev => prev + 1);
    }, 60000); 

    return () => clearInterval(interval);
  }, [displayUsers, markAsViewed]);

  // Advanced Recommendation Algorithm
  const suggestions = useMemo(() => {
    if (!currentUser) return [];

    // 1. Base Filter (Remove self, matched, blocked, and recently skipped)
    const matchedIds = chats.flatMap(c => c.users || []);
    const requestedIds = [...requests, ...sentRequests].map(r => r.fromId === currentUser.id ? r.toId : r.fromId);
    
    return nearbyUsers
      .filter(u => {
        if (u.id === currentUser.id) return false;
        if (matchedIds.includes(u.id)) return false;
        if (requestedIds.includes(u.id)) return false;
        
        // Hide skipped users for 24 hours
        const skipTime = skippedUsers[u.id];
        if (skipTime && Date.now() - skipTime < 24 * 60 * 60 * 1000) return false;
        
        return true;
      })
      .map(u => {
        let score = 0;
        
        // Priority: New users (Joined in last 48h)
        const joinDate = u.createdAt?.toMillis ? u.createdAt.toMillis() : 0;
        if (joinDate > Date.now() - 48 * 60 * 60 * 1000) score += 100;
        
        // Priority: Online/Active users
        const activeTime = u.lastActive?.toMillis ? u.lastActive.toMillis() : 0;
        if (Date.now() - activeTime < 5 * 60 * 1000) score += 50; // Active in last 5m
        
        // Priority: Nearby
        if (u.distance.includes('m') || (parseFloat(u.distance) < 2)) score += 30;
        
        // Anti-Repetition: Penalize users already viewed in this session
        if (sessionViews.has(u.id)) score -= 200;
        
        // Add subtle randomization (0-10 points) to keep feed feeling alive
        score += Math.random() * 15;
        
        return { ...u, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }, [nearbyUsers, currentUser, chats, requests, sentRequests, skippedUsers, sessionViews, refreshKey]);

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
            <div className="section-actions">
              <button className="refresh-feed-btn" onClick={() => setRefreshKey(prev => prev + 1)}>
                <Sparkles size={16} />
                Refresh
              </button>
              {!searchQuery.trim() && <button className="see-all-btn">See all</button>}
            </div>
          </div>
          
          <div className="suggested-cards-scroll">
            {displayUsers.map(user => (
              <div key={user.id} className="suggestion-card-wrapper">
                <div className="large-suggested-card" onClick={() => {
                  markAsViewed(user.id);
                  handleUserClick(user);
                }}>
                  <img src={user.avatar} alt={user.name} />
                  <div className="card-overlay">
                    <h4>{user.isLocked && !currentUser?.isPremium ? "Hidden" : `${user.name}, ${user.age || 21}`}</h4>
                  </div>
                </div>
                <button className="skip-user-btn" onClick={(e) => {
                  e.stopPropagation();
                  markAsSkipped(user.id);
                }}>
                  <X size={18} />
                </button>
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
