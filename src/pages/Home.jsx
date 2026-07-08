import { useState, useMemo, useEffect } from 'react';
import { Flame, Bell, Search, Map, ArrowRight, RotateCw, X, SlidersHorizontal, UserPlus, MessageSquare, Check, Zap, CheckCheck } from 'lucide-react';
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
    acceptRequest,
    rejectRequest,
    sendNotification,
    markNotificationsRead,
    locationPermission
  } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search Filter States
  const [filterDistance, setFilterDistance] = useState('all');
  const [filterAgeMin, setFilterAgeMin] = useState(18);
  const [filterAgeMax, setFilterAgeMax] = useState(60);
  const [filterCollege, setFilterCollege] = useState('all');
  const [filterInterests, setFilterInterests] = useState([]);

  // Upgraded States
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [alertTab, setAlertTab] = useState('requests');
  const [wavedUsers, setWavedUsers] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [declinedIds, setDeclinedIds] = useState(new Set());

  // Smart open: auto-switch tab based on what's pending
  const openAlertsDrawer = () => {
    const hasRequests = requests.length > 0;
    const hasUnread = notifications.some(n => !n.read);
    if (!hasRequests && hasUnread) setAlertTab('activity');
    else setAlertTab('requests');
    setIsAlertsDrawerOpen(true);
  };

  // Time ago helper
  const timeAgo = (ts) => {
    if (!ts) return '';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch { return ''; }
  };

  // Notification type config
  const notifConfig = (type) => {
    switch (type) {
      case 'wave':    return { emoji: '👋', label: 'waved at you',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
      case 'view':    return { emoji: '👀', label: 'viewed your profile', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' };
      case 'connect': return { emoji: '🤝', label: 'connected with you', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
      case 'message': return { emoji: '💬', label: 'sent you a message', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
      default:        return { emoji: '🔔', label: 'sent you a notification', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' };
    }
  };

  // Stats derived from data
  const todayViews   = notifications.filter(n => n.type === 'view'   && timeAgo(n.createdAt).includes('ago') === false || timeAgo(n.createdAt).endsWith('h ago') || timeAgo(n.createdAt) === 'just now').length;
  const todayWaves   = notifications.filter(n => n.type === 'wave').length;
  const connections  = chats.length;

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

  // direct wave hello trigger
  const handleWaveDirect = async (e, user) => {
    e.stopPropagation();
    if (!currentUser || wavedUsers.includes(user.id)) return;

    try {
      // 1. Send native push notification
      sendNotification(
        user.id, 
        'wave', 
        'waved at you 👋', 
        currentUser.id, 
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      );
      // 2. Add to session waved list
      setWavedUsers(prev => [...prev, user.id]);
    } catch(err) {
      console.error("Direct wave hello failed:", err);
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
        
        // 🔥 New users boost (first 72h)
        const joinDate = u.createdAt?.toMillis ? u.createdAt.toMillis() : 0;
        if (joinDate > Date.now() - 72 * 60 * 60 * 1000) score += 500;
        
        // ⚡ Profile Boost placement (absolute priority at the top)
        const isBoosted = u.boostUntil && u.boostUntil > Date.now();
        if (isBoosted) score += 5000;

        // ⚡ Active users boost (online recently)
        const activeTime = u.lastActive?.toMillis ? u.lastActive.toMillis() : 0;
        if (Date.now() - activeTime < 10 * 60 * 1000) score += 300; 
        
        // 📍 Proximity boost (hyper-local)
        if (u.distance === "Very Close") score += 200;
        if (u.distance.includes('m')) score += 150;
        if (parseFloat(u.distance) < 2) score += 100;
        
        // 🔄 Anti-staleness penalty
        if (sessionViews.has(u.id)) {
          score -= 1000;
        }
        
        // 🎲 Freshness jitter
        score += Math.random() * 250;
        
        return { ...u, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }, [nearbyUsers, currentUser, chats, skippedUsers, sessionViews, refreshKey]);

  // Search filter logic
  const displayUsers = useMemo(() => {
    if (!searchQuery.trim()) return suggestions;
    const queryStr = searchQuery.toLowerCase();
    return suggestions.filter(u => 
      u.name.toLowerCase().includes(queryStr) || 
      (u.profession && u.profession.toLowerCase().includes(queryStr)) ||
      (u.college && u.college.toLowerCase().includes(queryStr))
    );
  }, [suggestions, searchQuery]);

  // Get distinct colleges and interests dynamically from DB for filter dropdowns
  const uniqueColleges = useMemo(() => {
    const colleges = nearbyUsers.map(u => u.college).filter(Boolean);
    return ['all', ...new Set(colleges)];
  }, [nearbyUsers]);

  const uniqueInterests = useMemo(() => {
    const interests = nearbyUsers.flatMap(u => {
      if (!u.interests) return [];
      if (Array.isArray(u.interests)) return u.interests;
      return u.interests.split(',').map(i => i.trim()).filter(Boolean);
    });
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
        
        {/* Upgraded Bell click -> Opens Quick Alerts Drawer */}
        <button className="icon-btn-transparent" onClick={openAlertsDrawer} style={{ position: 'relative' }}>
          <Bell size={24} strokeWidth={1.8} />
          {totalAlerts > 0 && (
            <span className="unread-badge-premium">
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </span>
          )}
        </button>
      </div>

      {/* Location Permission Denied Banner */}
      {locationPermission === 'denied' && (
        <div id="location-denied-banner" style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: '12px',
          margin: '8px 16px 0',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          fontSize: '13px',
          lineHeight: '1.45'
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#f87171', display: 'block', marginBottom: '3px' }}>Location access blocked</strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              NearBudy needs your location to show nearby people.
              Click the <strong>🔒 lock / tune icon</strong> next to the URL bar → <strong>Site settings</strong> → set <strong>Location</strong> to <em>Allow</em>, then reload.
            </span>
            <button
              onClick={() => navigator.geolocation?.getCurrentPosition(() => window.location.reload(), () => {})}
              style={{
                marginTop: '8px',
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '12px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="home-content-new">
        {/* Polished Greeting Section */}
        <div className="greeting-section-mockup">
          <span className="hey-text-mockup">{getGreeting()} 👋</span>
          <h1 className="discover-text-mockup">{currentUser?.name?.split(' ')[0] || 'User'}</h1>
        </div>

        {/* Profile Boost Banner */}
        {currentUser?.boostUntil && currentUser.boostUntil > Date.now() && (
          <div className="active-boost-banner animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #fbbf24 0%, #ef4444 100%)', color: 'white', padding: '10px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: '800', margin: '0 16px 16px 16px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', justifyContent: 'center' }}>
            <Zap size={16} fill="white" />
            <span>⚡ Profile Boost Active: {Math.max(0, Math.ceil((currentUser.boostUntil - Date.now()) / 60000))}m remaining!</span>
          </div>
        )}

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
                    <img 
                      src={user.avatar ? getThumbnailUrl(user.avatar, 400) : '/default-avatar.png'} 
                      alt={user.name} 
                    />
                    
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
                      <h4>
                        {user.name}
                        {user.age ? `, ${user.age}` : ''}
                      </h4>
                      
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
                      {user.interests && user.interests.length > 0 && (() => {
                        const interestArr = Array.isArray(user.interests)
                          ? user.interests
                          : user.interests.split(',').map(i => i.trim()).filter(Boolean);
                        return interestArr.length > 0 ? (
                          <div className="card-interests-inline">
                            {interestArr.slice(0, 3).map((interest, idx) => {
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
                        ) : null;
                      })()}

                      {/* Split Actions Connect + Wave buttons row */}
                      {status === 'none' && (
                        <div className="card-actions-row" onClick={e => e.stopPropagation()}>
                          <button className="card-connect-btn connect flex-1" onClick={(e) => handleConnectDirect(e, user)}>
                            Connect
                          </button>
                          <button 
                            className={`card-wave-icon-btn ${wavedUsers.includes(user.id) ? 'waved' : ''}`} 
                            onClick={(e) => handleWaveDirect(e, user)}
                            disabled={wavedUsers.includes(user.id)}
                          >
                            {wavedUsers.includes(user.id) ? <Check size={16} strokeWidth={3} /> : '👋'}
                          </button>
                        </div>
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

      {/* Quick Alerts Sliding Drawer bottom overlay */}
      {isAlertsDrawerOpen && (
        <div className="alerts-drawer-overlay" onClick={() => setIsAlertsDrawerOpen(false)}>
          <div className="alerts-drawer-sheet" onClick={e => e.stopPropagation()}>

            {/* Drag handle */}
            <div className="alerts-drag-handle" />

            {/* Header */}
            <div className="alerts-drawer-header">
              <div>
                <h3>🔔 Alerts</h3>
                <p className="alerts-drawer-subtitle">
                  {requests.length > 0
                    ? `${requests.length} invite${requests.length > 1 ? 's' : ''} waiting`
                    : notifications.some(n => !n.read)
                      ? `${notifications.filter(n=>!n.read).length} unread`
                      : 'All caught up ✨'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {notifications.some(n => !n.read) && (
                  <button className="mark-read-btn" onClick={markNotificationsRead} title="Mark all read">
                    <CheckCheck size={15} />
                  </button>
                )}
                <button className="close-drawer-btn" onClick={() => setIsAlertsDrawerOpen(false)}>
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Mini stats bar */}
            <div className="alerts-stats-bar">
              <div className="alerts-stat">
                <span className="alerts-stat-val">{connections}</span>
                <span className="alerts-stat-lbl">Connections</span>
              </div>
              <div className="alerts-stat-divider" />
              <div className="alerts-stat">
                <span className="alerts-stat-val">{todayViews}</span>
                <span className="alerts-stat-lbl">Profile Views</span>
              </div>
              <div className="alerts-stat-divider" />
              <div className="alerts-stat">
                <span className="alerts-stat-val">{todayWaves}</span>
                <span className="alerts-stat-lbl">Waves</span>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="alerts-tab-bar">
              <button
                className={`alerts-tab ${alertTab === 'requests' ? 'active' : ''}`}
                onClick={() => setAlertTab('requests')}
              >
                Invites
                {requests.length > 0 && (
                  <span className="alerts-tab-badge">{requests.length}</span>
                )}
              </button>
              <button
                className={`alerts-tab ${alertTab === 'activity' ? 'active' : ''}`}
                onClick={() => setAlertTab('activity')}
              >
                Activity
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="alerts-tab-badge activity">{notifications.filter(n => !n.read).length}</span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className="alerts-drawer-body">

              {/* ── INVITES TAB ── */}
              {alertTab === 'requests' && (
                <>
                  {requests.length > 0 ? (
                    <div className="requests-drawer-list">
                      {requests.map(req => {
                        const user = nearbyUsers.find(u => u.id === req.fromId) || req.fromUser || { name: 'User', avatar: '/avatars/neutral.png' };
                        const wasAccepted = acceptedIds.has(req.id);
                        const wasDeclined = declinedIds.has(req.id);
                        return (
                          <div
                            key={req.id}
                            className={`drawer-request-item ${wasAccepted ? 'req-accepted' : ''} ${wasDeclined ? 'req-declined' : ''}`}
                            onClick={() => { setSelectedUser(user); setIsAlertsDrawerOpen(false); }}
                          >
                            <div className="drawer-avatar-wrap">
                              <img src={getThumbnailUrl(user.avatar, 80)} alt={user.name} className="drawer-item-avatar" />
                              {wasAccepted
                                ? <span className="drawer-avatar-emoji" style={{background:'rgba(16,185,129,0.2)',color:'#10b981'}}>✅</span>
                                : wasDeclined
                                  ? <span className="drawer-avatar-emoji" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>❌</span>
                                  : <span className="drawer-avatar-emoji">🤝</span>
                              }
                            </div>
                            <div className="drawer-item-info">
                              <h5>{user.name}</h5>
                              <p>{user.profession || 'Nearby'} · <span className="notif-time-inline">{timeAgo(req.createdAt)}</span></p>
                            </div>
                            {!wasAccepted && !wasDeclined ? (
                              <div className="drawer-item-actions" onClick={e => e.stopPropagation()}>
                                <button className="drawer-action-btn accept" onClick={() => {
                                  acceptRequest(req.id);
                                  setAcceptedIds(s => new Set([...s, req.id]));
                                }}>
                                  <Check size={13} /> Accept
                                </button>
                                <button className="drawer-action-btn decline" onClick={() => {
                                  rejectRequest(req.id);
                                  setDeclinedIds(s => new Set([...s, req.id]));
                                }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="req-status-label">{wasAccepted ? 'Accepted' : 'Declined'}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="alerts-empty-state">
                      <div className="alerts-empty-icon-wrap">🤝</div>
                      <p>No pending invites</p>
                      <span>Connection requests from nearby people appear here</span>
                      <button className="alerts-empty-action" onClick={() => { setIsAlertsDrawerOpen(false); navigate('/'); }}>
                        Explore Nearby
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── ACTIVITY TAB ── */}
              {alertTab === 'activity' && (
                <>
                  {notifications.length > 0 ? (
                    <>
                      {/* Group header row */}
                      <div className="activity-section-header">
                        <span>Recent</span>
                        {notifications.some(n => !n.read) && (
                          <button className="clear-all-btn" onClick={markNotificationsRead}>
                            Clear unread
                          </button>
                        )}
                      </div>
                      <div className="notifications-drawer-list">
                        {notifications.slice(0, 12).map(notif => {
                          const user = nearbyUsers.find(u => u.id === notif.fromId) || notif.fromUser || { name: 'Someone', avatar: '/avatars/neutral.png' };
                          const cfg = notifConfig(notif.type);
                          return (
                            <div
                              key={notif.id}
                              className={`drawer-notif-item ${notif.read ? 'read' : 'unread'}`}
                              onClick={() => { if (user.id) { setSelectedUser(user); setIsAlertsDrawerOpen(false); } }}
                            >
                              {!notif.read && <div className="notif-unread-dot" />}
                              <div className="drawer-avatar-wrap">
                                <img src={getThumbnailUrl(user.avatar, 80)} alt={user.name} className="drawer-item-avatar" />
                                <span className="drawer-avatar-emoji" style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji}</span>
                              </div>
                              <div className="drawer-item-info">
                                <p className="notif-text">
                                  <strong>{user.name}</strong> {cfg.label}
                                </p>
                                <div className="notif-meta">
                                  <span className="notif-type-pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji} {notif.type || 'alert'}</span>
                                  <span className="notif-time">{timeAgo(notif.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="alerts-empty-state">
                      <div className="alerts-empty-icon-wrap">🌐</div>
                      <p>No activity yet</p>
                      <span>Waves, views and connections will appear here</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              className="view-all-alerts-btn"
              onClick={() => { setIsAlertsDrawerOpen(false); navigate('/notifications'); }}
            >
              View Full Notification History →
            </button>
          </div>
        </div>
      )}

      <ProfilePreviewModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default Home;
