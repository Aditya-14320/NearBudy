import { useState, useMemo } from 'react';
import { Settings, Edit2, Globe, Share2, Users, ChevronRight, MapPin, Briefcase, Zap, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import PremiumModal from '../components/PremiumModal';
import { getOptimizedProfileUrl } from '../utils/cloudinary';
import './Profile.css';



const Profile = () => {
  const { currentUser, setCurrentUser, chats, requests, notifications } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('about'); // 'about' or 'circle'

  const timeAgo = (dateObj) => {
    if (!dateObj) return '';
    const date = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
  };

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

  const isBoostActive = useMemo(() => {
    return currentUser?.boostUntil && currentUser.boostUntil > Date.now();
  }, [currentUser?.boostUntil]);

  const boostMinsLeft = useMemo(() => {
    if (!currentUser?.boostUntil) return 0;
    return Math.max(0, Math.ceil((currentUser.boostUntil - Date.now()) / 60000));
  }, [currentUser?.boostUntil]);


  const handleBoostProfile = async () => {
    if (isBoostActive) {
      alert("Your profile is already boosted!");
      return;
    }
    
    try {
      const now = Date.now();
      const boostEndTime = now + 30 * 60 * 1000; // 30 minutes
      
      const userRef = doc(db, "users", currentUser.id);
      await updateDoc(userRef, {
        boostUntil: boostEndTime
      });
      
      setCurrentUser(prev => ({
        ...prev,
        boostUntil: boostEndTime
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
          <div className="profile-avatar-glow">
            <img src={getOptimizedProfileUrl(currentUser.avatar || '/avatars/neutral.png')} alt="Profile" className="main-avatar-new" />
          </div>
          
          <h3 className="profile-name-new">
            {currentUser.name}
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
              {isBoostActive ? `Boosted: ${boostMinsLeft}m` : `Boost Profile`}
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
              {currentUser.interests && currentUser.interests.length > 0 && (() => {
                const interestArr = Array.isArray(currentUser.interests)
                  ? currentUser.interests
                  : currentUser.interests.split(',').map(i => i.trim()).filter(Boolean);
                return interestArr.length > 0 ? (
                  <div className="profile-info-card">
                    <h4>Interests</h4>
                    <div className="interests-grid-cloud">
                      {interestArr.map(interest => (
                        <span key={interest} className="interest-pill-cloud">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

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

              {/* Premium Profile Views Section */}
              <div className="profile-views-premium-section" style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', margin: '0 16px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="views-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '15px' }}>👀 {notifications.filter(n => n.type === 'view').length} Profile Views</h4>
                </div>
                
                {!currentUser.isPremium ? (
                  <div className="premium-locked-views" onClick={() => setIsPremiumModalOpen(true)} style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <div className="lock-icon-wrap" style={{ marginBottom: '8px' }}><Lock size={24} color="#fbbf24" style={{ margin: '0 auto' }} /></div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>Upgrade to Premium to see who viewed your profile.</p>
                    <button className="unlock-premium-btn" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#1a1a1a', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>Unlock Premium</button>
                  </div>
                ) : (
                  <div className="premium-views-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notifications.filter(n => n.type === 'view').length === 0 ? (
                      <p className="no-views-yet" style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '10px 0' }}>No views yet. Try boosting your profile!</p>
                    ) : (
                      notifications.filter(n => n.type === 'view').sort((a,b) => b.timestamp - a.timestamp).map(notif => {
                        const viewer = notif.fromUser || { name: 'Someone', avatar: '/avatars/neutral.png' };
                        return (
                          <div key={notif.id} className="premium-view-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={getOptimizedProfileUrl(viewer.avatar)} alt={viewer.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div className="view-info" style={{ flex: 1 }}>
                              <strong style={{ display: 'block', fontSize: '14px' }}>{viewer.name}</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{timeAgo(notif.timestamp)}</span>
                            </div>
                            <button className="view-action-btn" onClick={() => navigate('/chat/' + viewer.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                               <Zap size={14} fill="currentColor" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
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

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
};

export default Profile;
