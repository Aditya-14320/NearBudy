import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Check, X, ArrowLeft, Eye, Hand, MapPin, Bell, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumModal from '../components/PremiumModal';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { getThumbnailUrl } from '../utils/cloudinary';
import './Notifications.css';

const Notifications = () => {
  const { currentUser, nearbyUsers, requests, acceptRequest, rejectRequest, notifications, markNotificationsRead } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const isPremium = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    return currentUser?.isPremium && currentUser?.premiumExpiresAt && new Date(currentUser.premiumExpiresAt).getTime() > Date.now();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      markNotificationsRead();
    }
  }, [activeTab, markNotificationsRead]);

  const getIconForType = (type) => {
    switch(type) {
      case 'view': return <Eye size={20} className="notif-icon view" />;
      case 'wave': return <Hand size={20} className="notif-icon wave" />;
      case 'nearby': return <MapPin size={20} className="notif-icon nearby" />;
      default: return <Bell size={20} className="notif-icon system" />;
    }
  };

  const timeAgo = (dateObj) => {
    if (!dateObj) return "Just now";
    // eslint-disable-next-line react-hooks/purity
    const diff = Math.floor((Date.now() - dateObj.toMillis()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff/60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  };

  const handleAlertClick = (notif) => {
    if (notif.type !== 'view' && notif.type !== 'wave') return;


    
    if (!isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    if (notif.fromUser?.id) {
      const fullUser = nearbyUsers.find(u => u.id === notif.fromUser.id);
      if (fullUser) {
        setSelectedUser(fullUser);
      } else {
        setSelectedUser({ ...notif.fromUser, distance: "Unknown", profession: "Unknown", isMock: true });
      }
    }
  };

  return (
    <div className="notifications-page animate-fade-in">
      <div className="top-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2>Activity</h2>
        <div style={{ width: 24 }}></div>
      </div>

      {!isPremium ? (
        <div className="premium-locked-requests-overlay animate-slide-up" onClick={() => setIsPremiumModalOpen(true)} style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', cursor: 'pointer', margin: '20px' }}>
          <Crown size={48} style={{ color: '#fbbf24', marginBottom: '20px', filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.4))' }} />
          <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Unlock Activity</h3>
          <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 24px 0' }}>Upgrade to NearBudy Pro to see who viewed you, who waved at you, and all your connection requests.</p>
          <button className="unlock-pro-btn" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: 'white', fontWeight: '800', fontSize: '15px', padding: '14px 32px', borderRadius: '14px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>Unlock Premium</button>
        </div>
      ) : (
        <>
          <div className="notif-tabs">
            <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
              Requests {requests.length > 0 && <span className="tab-badge">{requests.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
              Alerts {notifications.filter(n => !n.read).length > 0 && <span className="tab-badge">{notifications.filter(n => !n.read).length}</span>}
            </button>
          </div>

          <div className="requests-list">
            {activeTab === 'requests' ? (
              requests.length === 0 ? (
                <div className="empty-requests">
                  <p>No pending requests.</p>
                </div>
              ) : (
                requests.map(req => {
                  const fullUser = nearbyUsers.find(u => u.id === req.fromId) || { name: "User", profession: "Unknown", avatar: null };
                  
                  return (
                    <div key={req.id} className="request-card animate-slide-up">
                      <img src={getThumbnailUrl(fullUser.avatar, 100)} alt="Avatar" className="req-avatar" onClick={() => handleAlertClick({ type: 'view', fromUser: fullUser })} />
                      <div className="req-info">
                        <h4>{fullUser.name}</h4>
                        <p>{fullUser.profession}</p>
                        <span className="time-ago">{timeAgo(req.timestamp)}</span>
                      </div>
                      <div className="req-actions">
                        <button className="btn-icon accept" onClick={() => acceptRequest(req.id)}><Check size={20} /></button>
                        <button className="btn-icon reject" onClick={() => rejectRequest(req.id)}><X size={20} /></button>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              notifications.length === 0 ? (
                <div className="empty-requests">
                  <p>No new alerts.</p>
                </div>
              ) : (
                notifications.map(notif => {

                  const isIdentityAlert = notif.type === 'view' || notif.type === 'wave';
                  const canSeeIdentity = notif.fromUser;

                  return (
                    <div 
                      key={notif.id} 
                      className={`alert-card animate-slide-up ${!notif.read ? 'unread' : ''} ${isIdentityAlert ? 'clickable-alert' : ''}`}
                      onClick={() => handleAlertClick(notif)}
                    >
                      <div className="alert-icon-wrapper">
                        {canSeeIdentity ? (
                          <img src={getThumbnailUrl(notif.fromUser.avatar, 100)} alt="Avatar" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                        ) : (
                          getIconForType(notif.type)
                        )}
                      </div>
                      <div className="alert-details">
                        <p>
                          {canSeeIdentity 
                            ? <><span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{notif.fromUser.name}</span> {notif.type === 'wave' ? 'waved at you 👋' : 'viewed your profile 👀'}</>
                            : notif.message}
                        </p>
                        <span>{timeAgo(notif.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </>
      )}

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        onPaymentSuccess={() => {}}
      />
      
      <ProfilePreviewModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
};

export default Notifications;
