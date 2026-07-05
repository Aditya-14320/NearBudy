import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Navigation, UserPlus, MessageCircle, Hand } from 'lucide-react';
import { MapContainer, Marker, Circle, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import PremiumModal from '../components/PremiumModal';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { useAppContext } from '../context/AppContext';
import { getThumbnailUrl } from '../utils/cloudinary';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

const CENTER_POS = [28.6304, 77.2177];

// Helper component to pan/zoom map programmatically
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true, duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

// Check if user is online based on lastActive
const isUserOnline = (user) => {
  if (!user) return false;
  if (user.isMock) {
    // Deterministic state for mock profiles based on name characters
    return user.name.length % 2 === 0;
  }
  if (!user.lastActive) return false;
  try {
    const activeTime = user.lastActive.toMillis ? user.lastActive.toMillis() : new Date(user.lastActive).getTime();
    return Date.now() - activeTime < 5 * 60 * 1000; // Online if active within last 5 mins
  } catch (e) {
    return false;
  }
};

const isUserPremium = (user) => {
  if (!user) return false;
  if (!user.isPremium) return false;
  if (!user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
};

const VerifiedBadge = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="14" 
    height="14" 
    className="premium-verified-badge" 
    style={{ color: '#3b82f6', fill: 'currentColor', marginLeft: '4px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}
  >
    <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7 3.1 5.52l.34 3.7L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

// Coordinate offset jittering to prevent overlapping markers from completely blocking each other
const adjustOverlappingCoordinates = (users) => {
  const coordinatesMap = {};
  const tolerance = 0.00018; // Roughly 18-20 meters offset

  return users.map(user => {
    let lat = Number(user.lat || CENTER_POS[0]);
    let lng = Number(user.lng || CENTER_POS[1]);

    const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;

    if (!coordinatesMap[key]) {
      coordinatesMap[key] = [];
    }

    const count = coordinatesMap[key].length;
    coordinatesMap[key].push(user);

    if (count > 0) {
      // Offset overlapping items in a neat spiral/circular pattern
      const angle = count * (2 * Math.PI / 8); // Spread across 8 directions
      const radius = tolerance * (1 + Math.floor(count / 8) * 0.5);
      lat += Math.sin(angle) * radius;
      lng += Math.cos(angle) * radius;
    }

    return {
      ...user,
      lat,
      lng
    };
  });
};

const UserMarker = memo(({ user, isSelected, isOnline, onClick }) => {
  const [position, setPosition] = useState([user.lat, user.lng]);
  const animationRef = useRef(null);

  useEffect(() => {
    const startLat = position[0];
    const startLng = position[1];
    const endLat = user.lat;
    const endLng = user.lng;

    if (startLat === endLat && startLng === endLng) return;

    const duration = 1200; // 1.2s smooth slide transition
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2; // EaseInOutQuad

      const currentLat = startLat + (endLat - startLat) * ease;
      const currentLng = startLng + (endLng - startLng) * ease;

      setPosition([currentLat, currentLng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [user.lat, user.lng]);

  const icon = useMemo(() => {
    const onlineClass = isOnline ? 'online' : '';
    const selectedClass = isSelected ? 'selected' : '';
    const html = `
      <div class="user-pin-wrapper ${selectedClass}">
        ${isSelected ? '<div class="pin-pulse"></div>' : ''}
        <div class="user-pin ${onlineClass}">
          <img src="${getThumbnailUrl(user.avatar, 60)}" alt="User" />
        </div>
        <div class="pin-distance-label">${user.distance}</div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: html,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }, [user.avatar, isSelected, isOnline, user.distance]);

  return (
    <Marker 
      position={position} 
      icon={icon}
      eventHandlers={{ click: () => onClick(user) }}
    />
  );
});

const MapPage = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    nearbyUsers, 
    chats, 
    sendRequest, 
    acceptRequest, 
    requests, 
    sentRequests,
    sendNotification
  } = useAppContext();

  const [isPremium, setIsPremium] = useState(currentUser?.isPremium || false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // View States
  const [viewMode, setViewMode] = useState('radar'); // 'radar' | 'list'
  const [selectedFilter, setSelectedFilter] = useState('all');

  const myCenter = useMemo(() => {
    if (currentUser?.lat && currentUser?.lng) {
      return [currentUser.lat, currentUser.lng];
    }
    return CENTER_POS;
  }, [currentUser?.lat, currentUser?.lng]);

  const [mapCenter, setMapCenter] = useState(myCenter);
  const [mapZoom, setMapZoom] = useState(15);
  const carouselRef = useRef(null);

  // Recenter map automatically if my location changes
  useEffect(() => {
    setMapCenter(myCenter);
  }, [myCenter]);

  const realNearby = useMemo(() => {
    return nearbyUsers.filter(u => u.id !== currentUser?.id);
  }, [nearbyUsers, currentUser?.id]);

  // Adjust coordinates for overlapping real users dynamically (Jittering layout)
  const allMapUsers = useMemo(() => {
    return adjustOverlappingCoordinates(realNearby);
  }, [realNearby]);

  // Check relationship status dynamically
  const getRelationship = useCallback((user) => {
    if (!user || !currentUser) return { type: 'none' };
    const existingChat = chats.find(c => c.users?.includes(user.id));
    if (existingChat) {
      return { type: 'connected', chatId: existingChat.id };
    }
    const sent = sentRequests?.find(r => r.toId === user.id);
    if (sent) {
      return { type: 'pending' };
    }
    const incomingReq = requests?.find(r => r.fromId === user.id);
    if (incomingReq) {
      return { type: 'incoming', reqId: incomingReq.id };
    }
    return { type: 'none' };
  }, [chats, sentRequests, requests, currentUser]);

  // Apply active filters
  const filteredUsers = useMemo(() => {
    return allMapUsers.filter(user => {
      if (selectedFilter === 'online') {
        return isUserOnline(user);
      }
      if (selectedFilter === 'connected') {
        return getRelationship(user).type === 'connected';
      }
      if (selectedFilter === 'student') {
        return user.profession?.toLowerCase() === 'student';
      }
      return true; // 'all' filter shows everyone
    });
  }, [allMapUsers, selectedFilter, getRelationship]);

  const handlePaymentSuccess = () => {
    setIsPremium(true);
  };

  const handleUserClick = useCallback((user) => {
    setSelectedUser(user);
    if (user.lat && user.lng) {
      setMapCenter([user.lat, user.lng]);
    }
  }, []);

  const handleWave = useCallback((user) => {
    if (!user.isMock) {
      sendNotification(
        user.id, 
        'wave', 
        'Someone waved at you 👋', 
        currentUser.id, 
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      );
      alert(`Wave sent to ${user.name}! 👋`);
    } else {
      alert(`Waved at ${user.name} (Simulated Mock User) 👋`);
    }
  }, [currentUser, sendNotification]);

  const handleRecenter = () => {
    setMapCenter(myCenter);
    setMapZoom(15);
  };

  // Scroll carousel to selected user card
  useEffect(() => {
    if (selectedUser && carouselRef.current) {
      const cardEl = carouselRef.current.querySelector(`#card-${selectedUser.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedUser]);

  const handleCarouselCardClick = (user) => {
    if (selectedUser?.id === user.id) {
      setIsPreviewOpen(true);
    } else {
      setSelectedUser(user);
      if (user.lat && user.lng) {
        setMapCenter([user.lat, user.lng]);
      }
    }
  };

  const myLocationIcon = useMemo(() => L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="center-pin-wrapper">
        <div class="pin-pulse-1"></div>
        <div class="pin-pulse-2"></div>
        <div class="center-pin">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#a21caf"/></svg>
        </div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  }), []);

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'online', label: 'Online' },
    { id: 'connected', label: 'Connected' },
    { id: 'student', label: 'Students' }
  ];

  return (
    <div className="map-page-container">
      <div className="map-page-header">
        <button onClick={() => navigate(-1)} className="icon-btn-transparent">
          <ArrowLeft size={24} />
        </button>
        <h2>Nearby Radar</h2>
        <div style={{ width: 24 }}></div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle-row">
        <button 
          className={`toggle-tab-btn ${viewMode === 'radar' ? 'active' : ''}`}
          onClick={() => setViewMode('radar')}
        >
          Radar Map
        </button>
        <button 
          className={`toggle-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Nearby List
        </button>
      </div>

      {/* Filter Pills */}
      <div className="filters-carousel">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-pill-btn ${selectedFilter === f.id ? 'active' : ''}`}
            onClick={() => setSelectedFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {viewMode === 'radar' ? (
        <>
          <div className="map-box-container">
            <div className="nearby-pill">
              <Sparkles className="sparkle" size={14} /> 
              <span>{filteredUsers.length} matching</span>
            </div>

            {/* Recenter Button */}
            <button className="recenter-fab" onClick={handleRecenter} title="Recenter location">
              <Navigation size={18} />
            </button>
            
            <MapContainer 
              center={myCenter} 
              zoom={mapZoom} 
              zoomControl={false} 
              attributionControl={false} 
              style={{ height: '100%', width: '100%', background: 'transparent' }}
              dragging={true}
            >
              <ChangeView center={mapCenter} zoom={mapZoom} />

              {/* Concentric Radar Rings */}
              <Circle 
                center={myCenter} 
                radius={150} 
                pathOptions={{ color: 'rgba(162, 28, 175, 0.25)', dashArray: '5, 5', fillColor: 'transparent', weight: 1.5 }} 
              />
              <Circle 
                center={myCenter} 
                radius={400} 
                pathOptions={{ color: 'rgba(162, 28, 175, 0.18)', dashArray: '5, 5', fillColor: 'transparent', weight: 1.5 }} 
              />
              <Circle 
                center={myCenter} 
                radius={800} 
                pathOptions={{ color: 'rgba(162, 28, 175, 0.12)', dashArray: '5, 5', fillColor: 'transparent', weight: 1.5 }} 
              />
              
              <Marker position={myCenter} icon={myLocationIcon} />

              {filteredUsers.map((user) => (
                <UserMarker 
                  key={user.id} 
                  user={user} 
                  isSelected={selectedUser?.id === user.id}
                  isOnline={isUserOnline(user)} 
                  onClick={handleUserClick} 
                />
              ))}
            </MapContainer>

            {/* Radar Sweeping Beam */}
            <div className="radar-sweep-beam"></div>
          </div>

          {/* Bottom Swipeable User Carousel */}
          <div className="bottom-carousel-container" ref={carouselRef}>
            {filteredUsers.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              const online = isUserOnline(user);
              return (
                <div 
                  key={user.id} 
                  id={`card-${user.id}`}
                  className={`user-carousel-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCarouselCardClick(user)}
                >
                  <div className="carousel-card-avatar">
                    <img src={getThumbnailUrl(user.avatar, 100)} alt={user.name} />
                    {online && <span className="carousel-online-indicator"></span>}
                  </div>
                  <div className="carousel-card-info">
                    <div className="carousel-name-row">
                      <h4>{user.name}{isUserPremium(user) && <VerifiedBadge />}, {user.age || 22}</h4>
                      <span className="carousel-dist-tag">📍 {user.distance}</span>
                    </div>
                    <p className="carousel-prof">{user.profession || "NearBudy"}</p>
                    <button className="carousel-view-btn" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user);
                      setIsPreviewOpen(true);
                    }}>
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="carousel-empty-state">
                <p>No matching users in this range.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Nearby List View */
        <div className="nearby-list-container">
          {filteredUsers.map((user) => {
            const online = isUserOnline(user);
            const rel = getRelationship(user);
            return (
              <div 
                key={user.id} 
                className="list-user-item-card"
                onClick={() => {
                  setSelectedUser(user);
                  setIsPreviewOpen(true);
                }}
              >
                <div className="list-avatar-wrapper">
                  <img src={getThumbnailUrl(user.avatar, 100)} alt={user.name} />
                  {online && <span className="list-online-dot"></span>}
                </div>
                
                <div className="list-user-details">
                  <div className="list-user-header">
                    <h4>{user.name}{isUserPremium(user) && <VerifiedBadge />}, {user.age || 22}</h4>
                    <span className="list-dist-text">📍 {user.distance}</span>
                  </div>
                  <p className="list-user-profession">{user.profession || "Student"}</p>
                </div>

                <div className="list-user-actions" onClick={e => e.stopPropagation()}>
                  {rel.type === 'connected' ? (
                    <button className="list-btn msg" onClick={() => navigate(`/chat/${rel.chatId}`)}>
                      <MessageCircle size={15} /> Chat
                    </button>
                  ) : rel.type === 'pending' ? (
                    <button className="list-btn pending" disabled>
                      Sent
                    </button>
                  ) : rel.type === 'incoming' ? (
                    <button className="list-btn accept" onClick={() => acceptRequest(rel.reqId)}>
                      Accept
                    </button>
                  ) : (
                    <div className="list-btn-double">
                      <button className="list-btn wave" onClick={() => handleWave(user)} title="Wave">
                        👋
                      </button>
                      <button className="list-btn connect" onClick={() => sendRequest(user)} title="Connect">
                        <UserPlus size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="list-empty-state">
              <Sparkles size={36} style={{ color: 'var(--text-tertiary)' }} />
              <p>No matching users found nearby.</p>
            </div>
          )}
        </div>
      )}

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onPaymentSuccess={handlePaymentSuccess}
        customTitle="Unlock all nearby people"
        customSubtitle="See who's around you with unlimited nearby access."
      />

      <ProfilePreviewModal
        user={selectedUser}
        isOpen={isPreviewOpen && !!selectedUser}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default MapPage;
