import { useState, useMemo, useEffect } from 'react';
import { Flame, Bell, Search, Map, ArrowRight, RotateCw, X, SlidersHorizontal, UserPlus, MessageSquare, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import PremiumModal from '../components/PremiumModal';
import { getThumbnailUrl } from '../utils/cloudinary';
import './Home.css';

// Interest emojis mapping for styling actual user interests
const INTEREST_EMOJIS = {
  design: '🎨 ',
  gaming: '🎮 ',
  coffee: '☕ ',
  coding: '💻 ',
  music: '🎵 ',
  sports: '⚽ ',
  travel: '✈️ ',
  reading: '📚 ',
  photography: '📷 ',
  movies: '🎬 ',
  dance: '💃 ',
  cooking: '🍳 ',
  art: '🎨 ',
  fitness: '💪 ',
  food: '🍕 '
};

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
    markAsSkipped,
    sendRequest,
    acceptRequest
  } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search Filter States
  const [filterDistance, setFilterDistance] = useState('all');
  const [filterAgeMin, setFilterAgeMin] = useState(18);
  const [filterAgeMax, setFilterAgeMax] = useState(35);
  const [filterCollege, setFilterCollege] = useState('all');
  const [filterInterests, setFilterInterests] = useState([]);

  // Time-of-day Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Connection status helper based on real context relations
  const getConnectionStatus = (userId) => {
    const isChat = chats.some(c => c.users?.includes(userId));
    if (isChat) return 'connected';
    
    const isOriginalSent = sentRequests.some(r => r.toId === userId);
    if (isOriginalSent) return 'sent';
    
    const isOriginalReceived = requests.some(r => r.fromId === userId);
    if (isOriginalReceived) return 'received';
    
    return 'none';
  };

  // Online status check (active in last 10 minutes)
  const isOnline = (user) => {
    const activeTime = user.lastActive?.toMillis ? user.lastActive.toMillis() : 0;
    return Date.now() - activeTime < 10 * 60 * 1000;
  };

  // Direct connection action handlers
  const handleConnectDirect = (e, user) => {
    e.stopPropagation();
    sendRequest(user);
  };

  const handleAcceptDirect = (e, userId) => {
    e.stopPropagation();
    const incomingReq = requests?.find(r => r.fromId === userId);
    if (incomingReq) {
      acceptRequest(incomingReq.id);
    }
  };

  const handleChatDirect = (e, userId) => {
    e.stopPropagation();
    const chat = chats.find(c => c.users?.includes(userId));
    if (chat) {
      navigate(`/chat/${chat.id}`);
    } else {
      navigate('/chats');
    }
  };

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

  // Search filter logic
  const displayUsers = useMemo(() => {
    if (!searchQuery.trim()) return suggestions;
    const query = searchQuery.toLowerCase();
    return suggestions.filter(u => 
      u.name.toLowerCase().includes(query) || 
      (u.profession && u.profession.toLowerCase().includes(query)) ||
      (u.college && u.college.toLowerCase().includes(query))
    );
  }, [suggestions, searchQuery]);

  // Get distinct colleges and interests dynamically from DB for filter dropdowns
  const uniqueColleges = useMemo(() => {
    const colleges = nearbyUsers.map(u => u.college).filter(Boolean);
    return ['all', ...new Set(colleges)];
  }, [nearbyUsers]);

  const uniqueInterests = useMemo(() => {
    const interests = nearbyUsers.flatMap(u => u.interests || []);
    return [...new Set(interests)];
  }, [nearbyUsers]);

  // Apply custom filtering to displayUsers
  const filteredUsers = useMemo(() => {
    return displayUsers.filter(u => {
      // 1. Distance filter
      if (filterDistance !== 'all') {
        const dist = parseFloat(u.distance);
        if (isNaN(dist)) {
          if (filterDistance === '1km' && u.distance !== 'Very Close' && !u.distance.includes('m')) return false;
        } else {
          if (filterDistance === '1km' && dist > 1) return false;
          if (filterDistance === '5km' && dist > 5) return false;
          if (filterDistance === '10km' && dist > 10) return false;
        }
      }
      
      // 2. Age filter
      const age = u.age || 21;
      if (age < filterAgeMin || age > filterAgeMax) return false;
      
      // 3. College filter
      if (filterCollege !== 'all' && u.college !== filterCollege) return false;
      
      // 4. Interests filter
      if (filterInterests.length > 0) {
        const hasMatch = filterInterests.some(interest => u.interests?.includes(interest));
        if (!hasMatch) return false;
      }
      
      return true;
    });
  }, [displayUsers, filterDistance, filterAgeMin, filterAgeMax, filterCollege, filterInterests]);

  const unreadNotifs = notifications?.filter(n => !n.read).length || 0;
  const totalAlerts = (requests?.length || 0) + unreadNotifs;

  // Auto-rotate logic for suggested cards
  useEffect(() => {
    if (filteredUsers.length <= 4) return;
    
    const interval = setInterval(() => {
      const topIds = filteredUsers.slice(0, 2).map(u => u.id);
      topIds.forEach(id => markAsViewed(id));
      setRefreshKey(prev => prev + 1);
    }, 30000); 

    return () => clearInterval(interval);
  }, [filteredUsers, markAsViewed]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="home-container">
      {/* Header */}
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
        {/* Polished Greeting Section */}
        <div className="greeting-section-mockup">
          <span className="hey-text-mockup">{getGreeting()} 👋</span>
          <h1 className="discover-text-mockup">{currentUser?.name?.split(' ')[0] || 'User'}</h1>
        </div>

        {/* Search Bar with Settings icon */}
        <div className="search-bar-new">
          <Search size={20} strokeWidth={1.8} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search students by name or college" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            className={`filter-settings-btn ${isFilterOpen ? 'active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {isFilterOpen && (
          <div className="filter-drawer-panel">
            <div className="filter-group">
              <label>Max Distance</label>
              <div className="filter-options-row">
                {['all', '1km', '5km', '10km'].map(d => (
                  <button 
                    key={d} 
                    className={`filter-option-btn ${filterDistance === d ? 'active' : ''}`}
                    onClick={() => setFilterDistance(d)}
                  >
                    {d === 'all' ? 'Anywhere' : `< ${d}`}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <label>Age Range ({filterAgeMin} - {filterAgeMax})</label>
              <div className="age-slider-row">
                <input 
                  type="range" 
                  min="18" 
                  max="35" 
                  value={filterAgeMin} 
                  onChange={(e) => setFilterAgeMin(Math.min(parseInt(e.target.value), filterAgeMax - 1))}
                  className="age-slider"
                />
                <input 
                  type="range" 
                  min="18" 
                  max="35" 
                  value={filterAgeMax} 
                  onChange={(e) => setFilterAgeMax(Math.max(parseInt(e.target.value), filterAgeMin + 1))}
                  className="age-slider"
                />
              </div>
            </div>

            {uniqueColleges.length > 2 && (
              <div className="filter-group">
                <label>Filter by College</label>
                <select 
                  value={filterCollege} 
                  onChange={(e) => setFilterCollege(e.target.value)}
                  className="filter-select"
                >
                  {uniqueColleges.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All Colleges' : c}</option>
                  ))}
                </select>
              </div>
            )}

            {uniqueInterests.length > 0 && (
              <div className="filter-group">
                <label>Filter by Interests</label>
                <div className="filter-interests-pills">
                  {uniqueInterests.map(interest => {
                    const isSelected = filterInterests.includes(interest);
                    return (
                      <button 
                        key={interest} 
                        className={`interest-select-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            setFilterInterests(filterInterests.filter(i => i !== interest));
                          } else {
                            setFilterInterests([...filterInterests, interest]);
                          }
                        }}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <button className="clear-filters-btn" onClick={() => {
              setFilterDistance('all');
              setFilterAgeMin(18);
              setFilterAgeMax(35);
              setFilterCollege('all');
              setFilterInterests([]);
            }}>
              Reset Filters
            </button>
          </div>
        )}

        {/* Hero Live Animated Map Banner Card */}
        <div className="map-banner-card" onClick={() => navigate('/map')}>
          <div className="map-grid-overlay"></div>
          
          <div className="banner-left">
            <div className="banner-icon-circle">
              <Map size={20} strokeWidth={2} color="#f43f5e" />
            </div>
            <div className="banner-text">
              <h3>See who's nearby</h3>
              <p className="live-status-subtitle">
                <span className="live-pulse-dot"></span>
                {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} nearby
              </p>
            </div>
          </div>

          {/* Animating Radar & Avatars area */}
          <div className="banner-radar-area">
            <div className="radar-pulse-dot"></div>
            <div className="radar-circle-pulse"></div>
            <div className="radar-circle-pulse wave-2"></div>
            
            {nearbyUsers.slice(0, 3).map((user, idx) => (
              <div key={user.id} className={`floating-avatar avatar-${idx + 1} animated-float`}>
                <img src={user.avatar ? getThumbnailUrl(user.avatar, 80) : '/default-avatar.png'} alt="" />
              </div>
            ))}
          </div>

          {/* "Open Radar →" button */}
          <div className="banner-open-btn">
            <span>Open Radar</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </div>
        </div>

        {/* Suggested Section: "🔥 People You May Like" */}
        <div className="suggested-section-mockup">
          <div className="section-header-mockup">
            <h3>🔥 People You May Like</h3>
            <div className="header-actions-mockup">
              <button className="refresh-btn-pill" onClick={() => setRefreshKey(prev => prev + 1)}>
                <RotateCw size={12} strokeWidth={2.5} />
                <span>Refresh</span>
              </button>
              <button className="see-all-link">See all</button>
            </div>
          </div>
          
          <div className="suggested-cards-scroll">
            {filteredUsers.map(user => {
              const status = getConnectionStatus(user.id);
              const userIsOnline = isOnline(user);
              
              return (
                <div key={user.id} className="suggestion-card-wrapper">
                  <div className="large-suggested-card" onClick={() => {
                    markAsViewed(user.id);
                    handleUserClick(user);
                  }}>
                    {/* Render actual profile photo directly from DB */}
                    <img src={user.avatar ? getThumbnailUrl(user.avatar, 400) : '/default-avatar.png'} alt={user.name} />
                    
                    {/* Tiny Status Badge at the top-left */}
                    <div className="card-top-status-badge">
                      {userIsOnline ? (
                        <span className="badge-capsule online">🟢 Online</span>
                      ) : (
                        <span className="badge-capsule active">🟡 Active</span>
                      )}
                      {user.isVerified && (
                        <span className="badge-capsule verified">⭐ Verified</span>
                      )}
                    </div>

                    {/* Rich Card Info Overlay */}
                    <div className="card-overlay">
                      {/* Name & Age directly from DB */}
                      <h4>{user.name}{user.age ? `, ${user.age}` : ''}</h4>
                      
                      {/* Proximity Location with Pin Icon */}
                      {user.distance && (
                        <div className="card-info-item">
                          <span>📍</span>
                          <span>{user.distance} away</span>
                        </div>
                      )}

                      {/* College badge with Pin icon */}
                      {user.college && (
                        <div className="card-info-item">
                          <span>🏫</span>
                          <span>{user.college}</span>
                        </div>
                      )}

                      {/* Emojified inline interest tags from DB */}
                      {user.interests && user.interests.length > 0 && (
                        <div className="card-interests-inline">
                          {user.interests.slice(0, 3).map((interest, idx) => {
                            const lower = interest.toLowerCase();
                            const emoji = INTEREST_EMOJIS[lower] || '';
                            return (
                              <span key={idx} className="interest-span-item">
                                {idx > 0 && <span className="interest-dot-separator">  </span>}
                                {emoji}{interest}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Premium Connect / Chat Button on the card (height 48-52px) */}
                      {status === 'none' && (
                        <button className="card-connect-btn connect" onClick={(e) => handleConnectDirect(e, user)}>
                          Connect
                        </button>
                      )}
                      {status === 'sent' && (
                        <button className="card-connect-btn sent" disabled>
                          Requested
                        </button>
                      )}
                      {status === 'received' && (
                        <button className="card-connect-btn received" onClick={(e) => handleAcceptDirect(e, user.id)}>
                          Accept Request
                        </button>
                      )}
                      {status === 'connected' && (
                        <button className="card-connect-btn chat" onClick={(e) => handleChatDirect(e, user.id)}>
                          Chat Room
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Skip Close Button */}
                  <button className="skip-user-btn" onClick={(e) => {
                    e.stopPropagation();
                    markAsSkipped(user.id);
                  }}>
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <div className="empty-suggested-container">
                <p>No new profiles found in this area. Refresh feed!</p>
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
