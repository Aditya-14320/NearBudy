import { useState, useMemo, useCallback, memo } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { MapContainer, Marker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import PremiumModal from '../components/PremiumModal';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { useAppContext } from '../context/AppContext';
import { getThumbnailUrl } from '../utils/cloudinary';
import 'leaflet/dist/leaflet.css';
import './MapPage.css';

const CENTER_POS = [28.6304, 77.2177];

const UserMarker = memo(({ user, isPremium, onClick }) => {
  const icon = useMemo(() => {
    const isHidden = user.isLocked && !isPremium;
    const lockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    const html = isHidden 
      ? `<div class="user-pin locked"><img src="${getThumbnailUrl(user.avatar, 60)}" alt="Locked User" /><div class="lock-icon-overlay">${lockSvg}</div></div>`
      : `<div class="user-pin"><img src="${getThumbnailUrl(user.avatar, 60)}" alt="User" /></div>`;

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: html,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }, [user.avatar, user.isLocked, isPremium]);

  return (
    <Marker 
      position={[user.lat, user.lng]} 
      icon={icon}
      eventHandlers={{ click: () => onClick(user) }}
    />
  );
});

const MOCK_NAMES = ["Rohan", "Sneha", "Aditya", "Isha", "Vikram", "Anjali", "Karan", "Pooja", "Arjun", "Tanvi", "Siddharth", "Nisha", "Rahul", "Mehak", "Yash", "Riya"];
const MOCK_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna"
];

const generateSmartMockUsers = (centerLat, centerLng, realCount) => {
  // Goal: Maintain at least 15 users on the map for a "busy" feel
  const targetTotal = 15;
  const needed = Math.max(0, targetTotal - realCount);
  
  if (needed === 0) return [];

  return Array.from({ length: needed }).map((_, i) => {
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    const name = MOCK_NAMES[i % MOCK_NAMES.length];
    const avatar = MOCK_AVATARS[i % MOCK_AVATARS.length];
    
    return {
      id: `mock_gen_${i}`,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      avatar: avatar,
      name: name,
      profession: "Student",
      isLocked: true, // Mock users are always locked to encourage Premium
      isMock: true,
      activity: "Nearby"
    };
  });
};

const MapPage = () => {
  const navigate = useNavigate();
  const { currentUser, nearbyUsers } = useAppContext();
  const [isPremium, setIsPremium] = useState(currentUser?.isPremium || false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const realNearby = useMemo(() => {
    return nearbyUsers.filter(u => u.id !== currentUser?.id);
  }, [nearbyUsers, currentUser?.id]);

  const mockUsers = useMemo(() => {
    return generateSmartMockUsers(CENTER_POS[0], CENTER_POS[1], realNearby.length);
  }, [realNearby.length]);

  const allMapUsers = useMemo(() => {
    return [...realNearby, ...mockUsers];
  }, [realNearby, mockUsers]);

  const handlePaymentSuccess = () => {
    setIsPremium(true);
  };

  const handleUserClick = useCallback((user) => {
    if (user.isLocked && !isPremium) {
      setIsPremiumModalOpen(true);
    } else {
      setSelectedUser(user);
    }
  }, [isPremium, setIsPremiumModalOpen, setSelectedUser]);

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

  return (
    <div className="map-page-container">
      <div className="map-page-header">
        <button onClick={() => navigate(-1)} className="icon-btn-transparent">
          <ArrowLeft size={24} />
        </button>
        <h2>Nearby Map</h2>
        <div style={{ width: 24 }}></div> {/* Spacer for centering */}
      </div>

      <div className="map-box-container">
        <div className="nearby-pill">
          <Sparkles className="sparkle" size={16} /> 
          <span>{visibleNearby.length} visible nearby</span>
          <span className="locked-count">• +{mockLockedUsers.length} locked 🔒</span>
        </div>
        
        <MapContainer 
          center={CENTER_POS} 
          zoom={15} 
          zoomControl={false} 
          attributionControl={false} 
          style={{ height: '100%', width: '100%', background: 'transparent' }}
          dragging={true}
        >
          {/* TileLayer removed to show CSS radar grid background */}
          
          <Marker position={CENTER_POS} icon={myLocationIcon} />

          {allMapUsers.map((user) => (
            <UserMarker 
              key={user.id} 
              user={user} 
              isPremium={isPremium} 
              onClick={handleUserClick} 
            />
          ))}
        </MapContainer>
      </div>

      <div className="bottom-user-section">
        {/* Render a single user card simulating the mock */}
        {visibleNearby.length > 0 && (
          <div 
            className="nearby-user-card"
            onClick={() => handleUserClick(visibleNearby[0])}
          >
            <div className="card-avatar">
              <img src={getThumbnailUrl(visibleNearby[0].avatar, 100)} alt={visibleNearby[0].name} />
            </div>
            <div className="card-info">
              <h4>{visibleNearby[0].isLocked && !isPremium ? "Hidden User" : `${visibleNearby[0].name}, ${visibleNearby[0].age || 23}`}</h4>
              <p>{visibleNearby[0].activity || "coffee"} • {visibleNearby[0].timeAgo || "39m"}</p>
            </div>
          </div>
        )}
      </div>

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onPaymentSuccess={handlePaymentSuccess}
        customTitle="Unlock all nearby people"
        customSubtitle="See who's around you with unlimited nearby access."
      />

      <ProfilePreviewModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default MapPage;
