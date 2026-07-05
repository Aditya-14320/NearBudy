import { useState, useMemo, useEffect } from 'react';
import { Flame, Bell, Search, Map, ArrowRight, RotateCw, X, SlidersHorizontal, UserPlus, MessageSquare, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import PremiumModal from '../components/PremiumModal';
import { getThumbnailUrl } from '../utils/cloudinary';
import './Home.css';

// 14 Curated High-Quality portraits of real students (Unsplash free face database)
const REAL_STUDENT_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop", // Female
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop", // Male
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop"  // Female
];

// Mapping raw "Guest_" names to friendly real names
const GUEST_NAMES = ["Sarah", "Rahul", "Emily", "Aarav", "Priya", "Kabir", "Sneha", "Rohan", "Ananya", "Vikram", "Jessica", "Tanmay", "Neha", "Arjun"];

// Interest emojis mapping
const INTEREST_EMOJIS = {
  design: '🎨',
  gaming: '🎮',
  coffee: '☕',
  coding: '💻',
  music: '🎵',
  sports: '⚽',
  travel: '✈️',
  reading: '📚',
  photography: '📷',
  movies: '🎬',
  dance: '💃',
  cooking: '🍳',
  art: '🎨',
  fitness: '💪',
  food: '🍕'
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Helper to map robot/default avatars to real student face photos
  const getRealAvatarUrl = (user) => {
    if (!user.avatar || user.avatar.includes('dicebear') || user.avatar.includes('bottts') || user.avatar.includes('default-avatar')) {
      const seed = user.id || user.name || "default";
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      }
      const idx = Math.abs(hash) % REAL_STUDENT_PHOTOS.length;
      return REAL_STUDENT_PHOTOS[idx];
    }
    return getThumbnailUrl(user.avatar, 400);
  };

  // Clean Guest_ names to human names
  const getFriendlyName = (user) => {
    if (user.name && user.name.startsWith('Guest_')) {
      const num = parseInt(user.name.replace('Guest_', '')) || 0;
      return GUEST_NAMES[num % GUEST_NAMES.length];
    }
    return user.name;
  };

  // Gender emoji indicator
  const getGenderEmoji = (user) => {
    if (user.gender === 'female') return '👩';
    if (user.gender === 'male') return '👨';
    return '✨';
  };

  // Connection status helper
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

  // Direct action click triggers
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
    // Inject the real human face photo back into user object before opening preview modal
    const updatedUser = { ...user, avatar: getRealAvatarUrl(user), name: getFriendlyName(user) };
    setSelectedUser(updatedUser);
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
        {/* Welcomer Greeting Section */}
        <div className="greeting-section-mockup">
          <span className="hey-text-mockup">Hey {currentUser?.name?.split(' ')[0] || 'Aditya'} 👋</span>
          <h1 className="discover-text-mockup">
            Discover people <br />
            around <span>you</span>
          </h1>
          <p className="subtext-mockup">Find and connect with students near you.</p>
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
          <button className="filter-settings-btn">
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Live Animated Map Banner Card */}
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
                {nearbyUsers.length > 0 ? nearbyUsers.length : 28} people nearby
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
                <img src={getRealAvatarUrl(user)} alt="" />
              </div>
            ))}
          </div>

          <div className="banner-arrow-btn">
            <ArrowRight size={18} strokeWidth={2.5} color="black" />
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
            {displayUsers.map(user => {
              const status = getConnectionStatus(user.id);
              const userIsOnline = isOnline(user);
              const friendlyName = getFriendlyName(user);
              const genderEmoji = getGenderEmoji(user);
              
              return (
                <div key={user.id} className="suggestion-card-wrapper">
                  <div className="large-suggested-card" onClick={() => {
                    markAsViewed(user.id);
                    handleUserClick(user);
                  }}>
                    {/* Render high-quality human photo instead of robot */}
                    <img src={getRealAvatarUrl(user)} alt={friendlyName} />
                    
                    {/* Rich Card Info Overlay */}
                    <div className="card-overlay">
                      {/* Rich Online status & distance row */}
                      <div className="card-distance-row">
                        <span className={`status-circle-dot ${userIsOnline ? 'online' : 'active'}`}></span>
                        <span>{userIsOnline ? 'Online' : 'Active'} • {user.distance} away</span>
                      </div>
                      
                      {/* Name with gender emoji */}
                      <h4>{genderEmoji} {friendlyName}, {user.age || 21}</h4>
                      
                      {/* College badge with Pin icon */}
                      <div className="card-college-pill">
                        <span style={{ marginRight: '4px' }}>📍</span>
                        <span>{user.college || 'Campus Student'}</span>
                      </div>

                      {/* Emojified inline interest tags */}
                      {user.interests && user.interests.length > 0 && (
                        <div className="card-interests-inline">
                          {user.interests.slice(0, 3).map((interest, idx) => {
                            const lower = interest.toLowerCase();
                            const emoji = INTEREST_EMOJIS[lower] || '✨';
                            return (
                              <span key={idx} className="interest-span-item">
                                {idx > 0 && <span className="interest-dot-separator"> • </span>}
                                {emoji} {interest}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Premium Connect / Chat Button on the card */}
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
            
            {displayUsers.length === 0 && (
              <div className="empty-suggested-container">
                <p>No new students found around you. Refresh feed!</p>
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
