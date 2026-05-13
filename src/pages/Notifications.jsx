import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Check, X, ArrowLeft, Eye, Hand, MapPin, Bell } from 'lucide-react';
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
    return currentUser?.isPremium || (currentUser?.premiumUntil && currentUser?.premiumUntil > Date.now());
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
        <button className="icon-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={24} />
        </button>
        <h2>Activity</h2>
        <div style={{ width: 24 }}></div>
      </div>

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
            requests.map(req => (
              <div key={req.id} className="request-card animate-slide-up">
                <div className="req-user-info">
                  <img src={getThumbnailUrl(req.fromUser?.avatar, 100)} alt="Avatar" className="req-avatar" />
                  <div className="req-details">
                    <h4>{req.fromUser?.name}</h4>
                    <p>{req.fromUser?.profession}</p>
                  </div>
                </div>
                <div className="req-actions">
                  <button className="req-btn accept" onClick={() => acceptRequest(req.id)}>
                    <Check size={20} />
                  </button>
                  <button className="req-btn reject" onClick={() => rejectRequest(req.id)}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          notifications.length === 0 ? (
            <div className="empty-requests">
              <p>No new alerts.</p>
            </div>
          ) : (
            notifications.map(notif => {

              const isIdentityAlert = notif.type === 'view' || notif.type === 'wave';
              const canSeeIdentity = isPremium && notif.fromUser;

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
                  
                  {!isPremium && isIdentityAlert && (
                    <button className="btn-accent" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '12px', marginLeft: 'auto' }} onClick={(e) => {
                      e.stopPropagation();
                      setIsPremiumModalOpen(true);
                    }}>
                      Unlock
                    </button>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

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
