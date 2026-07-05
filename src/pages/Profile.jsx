import { useState, useMemo } from 'react';
import { Settings, Edit2, Crown, Globe, Share2, Users, ChevronRight, Sparkles, MapPin, Briefcase, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import PremiumModal from '../components/PremiumModal';
import { getOptimizedProfileUrl } from '../utils/cloudinary';
import './Profile.css';

const isUserPremium = (user) => {
  if (!user) return false;
  if (!user.isPremium) return false;
  if (!user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
};

const VerifiedBadge = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="16" 
    height="16" 
    className="premium-verified-badge" 
    style={{ color: '#3b82f6', fill: 'currentColor', marginLeft: '5px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}
  >
    <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7 3.1 5.52l.34 3.7L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const Profile = () => {
  const { currentUser, chats, requests, notifications } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('about'); // 'about' or 'circle'

  const handleShare = async () => {
    const inviteText = `Hey! Join me on NearBudy, a cool app to discover and chat with people nearby. Use my code: ${currentUser.referralCode || 'NEARBUDY'}\n\nDownload here: https://nearbudy.vercel.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join NearBudy',
          text: inviteText,
          url: 'https://nearbudy.vercel.app'
        });
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(inviteText);
      alert("Invite link copied to clipboard!");
    }
  };

  const isActuallyPremium = useMemo(() => {
    return currentUser?.isPremium && currentUser?.premiumExpiresAt && new Date(currentUser.premiumExpiresAt).getTime() > Date.now();
  }, [currentUser?.isPremium, currentUser?.premiumExpiresAt]);

  const premiumTimeLeftText = useMemo(() => {
    if (!currentUser?.premiumExpiresAt) return '';
    const diff = new Date(currentUser.premiumExpiresAt).getTime() - Date.now();
    if (diff <= 0) return '';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days > 0) return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours > 0) return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    const mins = Math.floor(diff / (60 * 1000));
    return `Expires in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }, [currentUser?.premiumExpiresAt]);

  const premiumTier = useMemo(() => {
    return isActuallyPremium ? (currentUser?.premiumPlan || 'yearly') : null;
  }, [isActuallyPremium, currentUser?.premiumPlan]);

  const isBoostActive = useMemo(() => {
    return currentUser?.boostUntil && currentUser.boostUntil > Date.now();
  }, [currentUser?.boostUntil]);

  const boostMinsLeft = useMemo(() => {
    if (!currentUser?.boostUntil) return 0;
    return Math.max(0, Math.ceil((currentUser.boostUntil - Date.now()) / 60000));
  }, [currentUser?.boostUntil]);

  const boostsCount = useMemo(() => {
    return currentUser?.boostsRemaining || 0;
  }, [currentUser?.boostsRemaining]);

  const handleBoostProfile = async () => {
    if (premiumTier !== 'monthly' && premiumTier !== 'yearly') {
      alert("🔒 Profile Boost is exclusive to Monthly and Yearly premium members!");
      setIsPremiumModalOpen(true);
      return;
    }
    
    if (isBoostActive) {
      alert("Your profile is already boosted!");
      return;
    }
    
    if (boostsCount <= 0) {
      alert("You have run out of profile boosts for this period. Buy more or upgrade plan!");
      return;
    }
    
    try {
      const now = Date.now();
      const boostEndTime = now + 30 * 60 * 1000; // 30 minutes
      const newCount = boostsCount - 1;
      
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        boostUntil: boostEndTime,
        boostsRemaining: newCount
      });
      
      setCurrentUser(prev => ({
        ...prev,
        boostUntil: boostEndTime,
        boostsRemaining: newCount
      }));
      
      alert("⚡ Profile Boosted! You are now placed at the top of other students' suggestion feeds for the next 30 minutes.");
    } catch(err) {
      console.error("Boost profile failed:", err);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="profile-container animate-fade-in">
      {/* Spotify-style Blurred Avatar backdrop cover */}
      <div className="profile-cover-backdrop">
        <img src={getOptimizedProfileUrl(currentUser.avatar || '/avatars/neutral.png')} alt="Blur Backdrop" />
        <div className="backdrop-overlay"></div>
      </div>

      <div className="profile-header-new">
        <h2>Profile</h2>
        <button className="settings-btn-premium" onClick={() => setIsSettingsModalOpen(true)}>
          <Settings size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="profile-content-scroll">
        <div className="profile-info-section-new">
          <div className={`profile-avatar-glow ${premiumTier === 'yearly' ? 'yearly-avatar-frame' : ''}`}>
            <img src={getOptimizedProfileUrl(currentUser.avatar || '/avatars/neutral.png')} alt="Profile" className="main-avatar-new" />
          </div>
          
          <h3 className="profile-name-new">
            {currentUser.name}
            {isUserPremium(currentUser) && <VerifiedBadge />}
            {premiumTier === 'yearly' && (
              <span className="yearly-supporter-badge" style={{ color: '#fbbf24', marginLeft: '5px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }} title="Yearly Supporter">
                <Crown size={14} fill="#fbbf24" />
              </span>
            )}
            {currentUser.age ? `, ${currentUser.age}` : ''}
            {currentUser.isOwner && <span className="owner-badge">✓</span>}
          </h3>
          <p className="profile-branch-new">
            {currentUser.profession}
          </p>

          <div className="profile-action-buttons-row" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>
            <button className="btn-edit-profile-capsule" onClick={() => setIsEditModalOpen(true)} style={{ flex: 1, margin: 0 }}>
              <Edit2 size={16} strokeWidth={1.5} /> Edit Profile
            </button>
            
            <button 
              className={`btn-boost-profile-capsule ${isBoostActive ? 'active' : ''}`}
              onClick={handleBoostProfile}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: isBoostActive ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'white',
                padding: '10px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isBoostActive ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none'
              }}
            >
              <Zap size={14} fill={isBoostActive ? 'white' : 'transparent'} color={isBoostActive ? 'white' : '#fbbf24'} />
              {isBoostActive ? `Boosted: ${boostMinsLeft}m` : `Boost (${boostsCount})`}
            </button>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="profile-tabs-nav">
          <button 
            className={`profile-tab-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
          <button 
            className={`profile-tab-link ${activeTab === 'circle' ? 'active' : ''}`}
            onClick={() => setActiveTab('circle')}
          >
            My Circle
          </button>
        </div>

        <div className="profile-tab-content animate-fade-in">
          {activeTab === 'about' ? (
            <div className="about-tab-pane">
              {/* Premium Status Banner */}
              {isActuallyPremium ? (
                <div className="premium-status-card active animate-pulse">
                  <Crown size={22} className="crown-gold" />
                  <div className="premium-card-text">
                    <h4>Premium Membership Active</h4>
                    <p style={{ marginBottom: '8px' }}>Enjoy custom radar map themes, voice messaging, and unlimited chats!</p>
                    {premiumTimeLeftText && (
                      <span className="premium-countdown-tag" style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.15)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                        🕒 {premiumTimeLeftText}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="premium-status-card upgrade" onClick={() => setIsPremiumModalOpen(true)}>
                  <div className="upgrade-icon-glow">
                    <Sparkles size={22} className="sparkles-purple" />
                  </div>
                  <div className="premium-card-text">
                    <h4>Unlock Premium Features</h4>
                    <p>Access custom filters, voice notes, radar themes, and more.</p>
                  </div>
                  <ChevronRight size={18} />
                </div>
              )}


              {/* Bio card */}
              {currentUser.bio ? (
                <div className="profile-info-card">
                  <h4>About Me</h4>
                  <p className="bio-text">{currentUser.bio}</p>
                </div>
              ) : (
                <div className="profile-info-card empty" onClick={() => setIsEditModalOpen(true)}>
                  <p>Add a bio to let people know more about you...</p>
                </div>
              )}

              {/* Interests tag cloud */}
              {currentUser.interests && currentUser.interests.length > 0 && (
                <div className="profile-info-card">
                  <h4>Interests</h4>
                  <div className="interests-grid-cloud">
                    {currentUser.interests.map(interest => (
                      <span key={interest} className="interest-pill-cloud">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Demographics Information details */}
              <div className="profile-info-card details-card">
                <h4>Information</h4>
                <div className="details-list">
                  {currentUser.profession && (
                    <div className="details-item">
                      <Briefcase size={16} />
                      <span>{currentUser.profession}</span>
                    </div>
                  )}
                  {currentUser.city && (
                    <div className="details-item">
                      <MapPin size={16} />
                      <span>{currentUser.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="circle-tab-pane">
              {/* Stats card row */}
              <div className="profile-stats-row-tab">
                <div className="stat-box">
                  <span className="stat-value">{chats.length}</span>
                  <span className="stat-label">Friends</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-box">
                  <span className="stat-value">{notifications.filter(n => n.type === 'view').length}</span>
                  <span className="stat-label">Views</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-box">
                  <span className="stat-value">{notifications.filter(n => n.type === 'wave').length}</span>
                  <span className="stat-label">Waves</span>
                </div>
              </div>

              {/* Share invite banner */}
              <div className="invite-banner-card-tab" onClick={handleShare}>
                <div className="invite-icon-box">
                  <Users size={24} color="white" />
                </div>
                <div className="invite-banner-text">
                  <h3>Grow Your Circle</h3>
                  <p>Share invite code: <span className="referral-code-pill-tab">{currentUser.referralCode}</span></p>
                </div>
                <Share2 size={20} className="share-icon-right" />
              </div>

              {/* Navigation lists */}
              <div className="menu-list-container-tab">
                <div className="menu-list-item-tab" onClick={() => navigate('/notifications')}>
                  <div className="menu-item-content">
                    <span>Connection Requests</span>
                    {requests.length > 0 && <span className="menu-badge-tab">{requests.length}</span>}
                  </div>
                  <ChevronRight size={16} />
                </div>
                <div className="menu-list-item-tab" onClick={() => navigate('/connections')}>
                  <div className="menu-item-content">
                    <span>My Circle List</span>
                    {chats.length > 0 && <span className="menu-badge-tab gray">{chats.length}</span>}
                  </div>
                  <ChevronRight size={16} />
                </div>
                <div className="menu-list-item-tab" onClick={() => navigate('/notifications')}>
                  <div className="menu-item-content">
                    <span>Activity Alerts</span>
                  </div>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {isPremiumModalOpen && (
        <PremiumModal 
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)} 
          onPaymentSuccess={() => {}} 
        />
      )}
    </div>
  );
};

export default Profile;
