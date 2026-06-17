import { useState, useMemo } from 'react';
import { Settings, Edit2, Crown, Globe, Share2, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import PremiumModal from '../components/PremiumModal';
import { getOptimizedProfileUrl } from '../utils/cloudinary';
import './Profile.css';

const Profile = () => {
  const { currentUser, upgradeAccount, chats, requests, notifications } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);


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
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(inviteText);
      alert("Invite link copied to clipboard!");
    }
  };

  const isActuallyPremium = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    return currentUser?.premiumUntil && currentUser?.premiumUntil > Date.now();
  }, [currentUser?.premiumUntil]);

  if (!currentUser) return null;

  return (
    <div className="profile-container animate-fade-in">
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
            {currentUser.name}{currentUser.age ? `, ${currentUser.age}` : ''}
            {currentUser.isOwner && <span className="owner-badge">✓</span>}
          </h3>
          <p className="profile-branch-new">
            {currentUser.profession}
          </p>

          <div className="profile-stats-row">
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

          <button className="btn-edit-profile-capsule" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 size={18} strokeWidth={1.5} /> Edit profile
          </button>
        </div>

        <div className="profile-actions-list">
          {/* Premium banner removed for Play Store release */}

          <div className="invite-banner-card" onClick={handleShare}>
            <div className="invite-icon-box">
              <Users size={24} color="white" />
            </div>
            <div className="invite-banner-text">
              <h3>Grow Your Circle</h3>
              <p>Code: <span className="referral-code-pill">{currentUser.referralCode}</span></p>
            </div>
            <Share2 size={20} className="share-icon-right" />
          </div>

          <div className="menu-list-container">
            <div className="menu-list-item" onClick={() => navigate('/notifications')}>
              <div className="menu-item-content">
                <span>Connection requests</span>
                {requests.length > 0 && <span className="menu-badge">{requests.length}</span>}
              </div>
            </div>
            <div className="menu-list-item" onClick={() => navigate('/connections')}>
              <div className="menu-item-content">
                <span>My Circle</span>
                {chats.length > 0 && <span className="menu-badge gray">{chats.length}</span>}
              </div>
            </div>
            <div className="menu-list-item" onClick={() => navigate('/notifications')}>
              <span>Activity Alerts</span>
            </div>
          </div>
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
          onClose={() => setIsPremiumModalOpen(false)} 
          onSuccess={() => {}} 
        />
      )}
    </div>
  );
};

export default Profile;
