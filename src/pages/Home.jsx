import { useState, useMemo, useEffect } from 'react';
import { Flame, Bell, Search, Map, ArrowRight, RotateCw, X, GraduationCap, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import PremiumModal from '../components/PremiumModal';
import { getThumbnailUrl } from '../utils/cloudinary';
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

  // Hyper-Dynamic Recommendation Algorithm (Tinder-like matches)
  const suggestions = useMemo(() => {
    if (!currentUser) return [];

    const matchedIds = chats.flatMap(c => c.users || []);
    
    return nearbyUsers
      .filter(u => {
        if (u.id === currentUser.id) return false;
        if (matchedIds.includes(u.id)) return false;
        
        // Hide skipped users for 24h
        const skipTime = skippedUsers[u.id];
        if (skipTime && Date.now() - skipTime < 24 * 60 * 60 * 1000) return false;
        
        return true;
      })
      .map(u => {
        let score = 0;
        
        // 🔥 PRIORITY 1: New users (Extreme boost for first 72h)
        const joinDate = u.createdAt?.toMillis ? u.createdAt.toMillis() : 0;
        if (joinDate > Date.now() - 72 * 60 * 60 * 1000) score += 500;
        
        // ⚡ PRIORITY 2: Active users (Online or active recently)
        const activeTime = u.lastActive?.toMillis ? u.lastActive.toMillis() : 0;
        if (Date.now() - activeTime < 10 * 60 * 1000) score += 300; 
        
        // 📍 PRIORITY 3: Proximity (Hyper-local boost)
        if (u.distance === "Very Close") score += 200;
        if (u.distance.includes('m')) score += 150;
        if (parseFloat(u.distance) < 2) score += 100;
        
        // 🔄 ANTI-STALENESS: Heavy penalty for already seen in this session
        if (sessionViews.has(u.id)) {
          score -= 1000;
        }
        
        // 🎲 FRESHNESS JITTER: High randomization for "Fresh on Refresh" feeling
        score += Math.random() * 250;
        
        return { ...u, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }, [nearbyUsers, currentUser, chats, skippedUsers, sessionViews, refreshKey]);

  // Search logic on suggestions
  const displayUsers = useMemo(() => {
    if (!searchQuery.trim()) return suggestions;
    const query = searchQuery.toLowerCase();
    return suggestions.filter(u => 
      u.name.toLowerCase().includes(query) || 
      (u.profession && u.profession.toLowerCase().includes(query)) ||
      (u.college && u.college.toLowerCase().includes(query))
    );
  }, [suggestions, searchQuery]);

  const unreadNotifs = notifications?.filter(n => !n.read).length || 0;
  const totalAlerts = (requests?.length || 0) + unreadNotifs;

  // Auto-rotate Spotlight logic: cycle profiles every 30 seconds
  useEffect(() => {
    if (displayUsers.length <= 4) return;
    
    const interval = setInterval(() => {
      const topIds = displayUsers.slice(0, 2).map(u => u.id);
      topIds.forEach(id => markAsViewed(id));
      setRefreshKey(prev => prev + 1);
    }, 30000); 

    return () => clearInterval(interval);
  }, [displayUsers, markAsViewed]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="home-container">
      {/* Mockup Header */}
      <div className="home-header-new">
        <div className="logo-title">
          <div className="logo-box">
            <Flame size={20} strokeWidth={2.5} color="white" fill="white" />
          </div>
          <h2>Nearby</h2>
        </div>
        <button className="icon-btn-transparent" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
          <Bell size={24} strokeWidth={1.8} />
          {totalAlerts > 0 && (
            <span className="unread-badge-premium">
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </span>
          )}
        </button>
      </div>

      <div className="home-content-new">
        {/* Mockup Greeting Section */}
        <div className="greeting-section-mockup">
          <span className="hey-text-mockup">Hey {currentUser?.name?.split(' ')[0] || 'Aditya'} 👋</span>
          <h1 className="discover-text-mockup">
            Discover people <br />
            around <span>you</span>
          </h1>
          <p className="subtext-mockup">Find and connect with students near you.</p>
        </div>

        {/* Mockup Search Bar */}
        <div className="search-bar-new">
          <Search size={20} strokeWidth={1.8} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search students by name or college" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="filter-settings-btn">
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Mockup Map Banner Card */}
        <div className="map-banner-card" onClick={() => navigate('/map')}>
          <div className="map-grid-overlay"></div>
          
          <div className="banner-left">
            <div className="banner-icon-circle">
              <Map size={20} strokeWidth={2} color="#f43f5e" />
            </div>
            <div className="banner-text">
              <h3>See who's nearby</h3>
              <p>Open the live map</p>
            </div>
          </div>

          {/* Floating Radar & Avatars area */}
          <div className="banner-radar-area">
            <div className="radar-pulse-dot"></div>
            <div className="radar-circle-pulse"></div>
            <div className="radar-circle-pulse wave-2"></div>
            
            {nearbyUsers.slice(0, 3).map((user, idx) => (
              <div key={user.id} className={`floating-avatar avatar-${idx + 1}`}>
                <img src={getThumbnailUrl(user.avatar, 80)} alt="" />
              </div>
            ))}
          </div>

          <div className="banner-arrow-btn">
            <ArrowRight size={18} strokeWidth={2.5} color="black" />
          </div>
        </div>

        {/* Suggested Section */}
        <div className="suggested-section-mockup">
          <div className="section-header-mockup">
            <h3>Suggested for you</h3>
            <div className="header-actions-mockup">
              <button className="refresh-btn-pill" onClick={() => setRefreshKey(prev => prev + 1)}>
                <RotateCw size={12} strokeWidth={2.5} />
                <span>Refresh</span>
              </button>
              <button className="see-all-link">See all</button>
            </div>
          </div>
          
          <div className="suggested-cards-scroll">
            {displayUsers.map(user => (
              <div key={user.id} className="suggestion-card-wrapper">
                <div className="large-suggested-card" onClick={() => {
                  markAsViewed(user.id);
                  handleUserClick(user);
                }}>
                  <img src={getThumbnailUrl(user.avatar, 400)} alt={user.name} />
                  
                  {/* Card Info Overlay */}
                  <div className="card-overlay">
                    <div className="card-distance-row">
                      <span className="online-green-dot"></span>
                      <span>{user.distance} away</span>
                    </div>
                    
                    <h4>{user.name}, {user.age || 21}</h4>
                    
                    <div className="card-college-pill">
                      <GraduationCap size={12} strokeWidth={2.5} />
                      <span>{user.college || 'Campus Student'}</span>
                    </div>

                    {user.interests && user.interests.length > 0 && (
                      <div className="card-interests-row">
                        {user.interests.slice(0, 2).map((interest, idx) => (
                          <span key={idx} className="interest-pill-outline">{interest}</span>
                        ))}
                        {user.interests.length > 2 && (
                          <span className="interest-pill-more">+{user.interests.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Floating Skip/Remove Close Button */}
                <button className="skip-user-btn" onClick={(e) => {
                  e.stopPropagation();
                  markAsSkipped(user.id);
                }}>
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            
            {displayUsers.length === 0 && (
              <div className="empty-suggested-container">
                <p>No new suggestions found. Try refreshing!</p>
              </div>
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
