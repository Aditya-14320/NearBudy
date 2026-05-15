import { useState } from 'react';
import { X, MapPin, ChevronRight, Bell, Hand, Eye, Shield, HelpCircle, LogOut, FileText, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import BlockedUsersModal from './BlockedUsersModal';
import PremiumModal from './PremiumModal';
import './SettingsModal.css';
import { useNavigate } from 'react-router-dom';

const SettingsModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, deleteAccount } = useAppContext();
  const navigate = useNavigate();
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const settings = currentUser.settings || { nearbyAlerts: true, waves: true, profileViews: true };

  const handleGhostToggle = async () => {
    /*
    const isPremiumActive = currentUser?.premiumUntil && currentUser.premiumUntil > Date.now();
    if (!isPremiumActive) {
      setIsPremiumModalOpen(true);
      return;
    }
    */
    try {
      const newGhostState = !currentUser.ghostMode;
      await updateDoc(doc(db, "users", currentUser.id), { ghostMode: newGhostState });
      setCurrentUser(prev => ({ ...prev, ghostMode: newGhostState }));
    } catch (e) {
      console.error("Error toggling Ghost Mode:", e);
    }
  };

  const handleSettingToggle = async (key) => {
    const newValue = !(settings[key] ?? true);
    try {
      await updateDoc(doc(db, "users", currentUser.id), { [`settings.${key}`]: newValue });
      setCurrentUser(prev => ({ ...prev, settings: { ...settings, [key]: newValue } }));
    } catch (e) {
      console.error("Error updating settings:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("⚠️ Are you absolutely sure? This will permanently delete your account, your profile, and all your data. This action CANNOT be undone.");
    if (!confirmed) return;

    const doubleConfirmed = window.confirm("Final Warning: Do you want to permanently delete all your data?");
    if (!doubleConfirmed) return;

    setIsDeleting(true);
    const success = await deleteAccount();
    if (success) {
      navigate('/login');
      onClose();
    }
    setIsDeleting(false);
  };

  const handlePaymentSuccess = (newExpiry) => {
    setCurrentUser(prev => ({ ...prev, isPremium: true, premiumUntil: newExpiry }));
  };

  return (
    <div className="settings-overlay animate-fade-in" onClick={onClose}>
      <div className="settings-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-content">
          <h4 className="settings-group-title">Visibility</h4>
          <div className="settings-group">
            <div className="settings-item" onClick={handleGhostToggle}>
              <div className="item-left">
                <div className="icon-wrapper"><MapPin size={20} /></div>
                <span>Ghost Mode</span>
              </div>
              <div className={`toggle-switch ${currentUser.ghostMode ? 'active' : ''}`}></div>
            </div>
          </div>

          <h4 className="settings-group-title">Smart Notifications</h4>
          <div className="settings-group">
            <div className="settings-item" onClick={() => handleSettingToggle('nearbyAlerts')}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899'}}><Bell size={20} /></div>
                <span>Nearby Alerts</span>
              </div>
              <div className={`toggle-switch ${settings.nearbyAlerts ?? true ? 'active' : ''}`}></div>
            </div>
            
            <div className="settings-item" onClick={() => handleSettingToggle('waves')}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(234, 179, 8, 0.1)', color: '#eab308'}}><Hand size={20} /></div>
                <span>Wave Notifications</span>
              </div>
              <div className={`toggle-switch ${settings.waves ?? true ? 'active' : ''}`}></div>
            </div>

            <div className="settings-item" onClick={() => handleSettingToggle('profileViews')}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7'}}><Eye size={20} /></div>
                <span>Profile Views</span>
              </div>
              <div className={`toggle-switch ${settings.profileViews ?? true ? 'active' : ''}`}></div>
            </div>
          </div>

          <h4 className="settings-group-title">Privacy & Safety</h4>
          <div className="settings-group">
            <div className="settings-item" onClick={() => setIsBlockedModalOpen(true)}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)'}}><Shield size={20} /></div>
                <span>Blocked Users</span>
              </div>
              <ChevronRight size={20} className="chevron" />
            </div>
            <div className="settings-item" onClick={() => { onClose(); navigate('/privacy'); }}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'}}><Shield size={20} /></div>
                <span>Privacy Policy</span>
              </div>
              <ChevronRight size={20} className="chevron" />
            </div>
            <div className="settings-item" onClick={() => { onClose(); navigate('/terms'); }}>
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7'}}><FileText size={20} /></div>
                <span>Terms & Conditions</span>
              </div>
              <ChevronRight size={20} className="chevron" />
            </div>
            <div className="settings-item">
              <div className="item-left">
                <div className="icon-wrapper" style={{background: 'var(--bg-tertiary)'}}><HelpCircle size={20} /></div>
                <span>Help & Support</span>
              </div>
              <ChevronRight size={20} className="chevron" />
            </div>
          </div>

          <div className="danger-zone">
            <button className="logout-btn" onClick={handleLogout} disabled={isDeleting}>
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
            <button className="delete-account-btn" onClick={() => { onClose(); navigate('/delete-account'); }}>
              <Trash2 size={20} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      <BlockedUsersModal 
        isOpen={isBlockedModalOpen} 
        onClose={() => setIsBlockedModalOpen(false)} 
      />
      {isPremiumModalOpen && (
        <PremiumModal 
          onClose={() => setIsPremiumModalOpen(false)} 
          onSuccess={handlePaymentSuccess} 
        />
      )}
    </div>
  );
};

export default SettingsModal;
