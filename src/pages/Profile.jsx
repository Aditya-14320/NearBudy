import { useState, useMemo } from 'react';
import { Settings, Edit2, Crown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from '../components/EditProfileModal';
import SettingsModal from '../components/SettingsModal';
import PremiumModal from '../components/PremiumModal';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const isActuallyPremium = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    return currentUser?.premiumUntil && currentUser?.premiumUntil > Date.now();
  }, [currentUser?.premiumUntil]);

  if (!currentUser) return null;

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-header-new">
        <h2>Profile</h2>
        <button className="icon-btn" onClick={() => setIsSettingsModalOpen(true)}>
          <Settings size={26} strokeWidth={1.5} />
        </button>
      </div>

      <div className="profile-content-scroll">
        <div className="profile-info-section-new">
          <div className="profile-avatar-glow">
            <img src={currentUser.avatar || 'https://via.placeholder.com/150'} alt="Profile" className="main-avatar-new" />
          </div>
          
          <h3 className="profile-name-new">
            {currentUser.name}{currentUser.age ? `, ${currentUser.age}` : ''}
          </h3>
          <p className="profile-branch-new">
            {currentUser.profession}
          </p>
          <p className="profile-college-new">
            {currentUser.college || 'Lnct'}
          </p>

          <button className="btn-edit-profile-capsule" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 size={18} strokeWidth={1.5} /> Edit profile
          </button>
        </div>

        <div className="profile-actions-list">
          {!isActuallyPremium ? (
            <div className="premium-banner-card" onClick={() => setIsPremiumModalOpen(true)}>
              <Crown size={30} strokeWidth={1.5} className="premium-crown-icon" />
              <div className="premium-banner-text">
                <h3>Get Nearby Pro</h3>
                <p>Unlock everyone around you</p>
              </div>
            </div>
          ) : (
            <div className="premium-banner-card active" onClick={() => setIsPremiumModalOpen(true)}>
              <Crown size={28} className="premium-crown-icon" />
              <div className="premium-banner-text">
                <h3>Nearby Pro Active</h3>
                <p>You have unlimited access</p>
              </div>
            </div>
          )}

          <div className="menu-list-container">
            <div className="menu-list-item" onClick={() => navigate('/notifications')}>
              <span>Connection requests</span>
            </div>
            <div className="menu-list-item" onClick={() => navigate('/notifications')}>
              <span>Notifications</span>
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
