import { useState, useEffect } from 'react';
import { X, UserPlus, Zap, ShieldAlert, Ban, MessageCircle, Hand } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import ReportModal from './ReportModal';
import './ProfilePreviewModal.css';

const ProfilePreviewModal = ({ user, isOpen, onClose }) => {
  const { 
    currentUser, 
    sendRequest, 
    blockUser, 
    createQuickChat,
    requests,
    sentRequests,
    chats,
    acceptRequest,
    sendNotification
  } = useAppContext();
  
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user && !user.isMock && currentUser && user.id !== currentUser.id) {
      sendNotification(user.id, 'view', 'Someone viewed your profile 👀', currentUser.id, { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
    }
  }, [isOpen, user, currentUser, sendNotification]);

  if (!isOpen || !user) return null;

  // Calculate relationship state dynamically based on global database state
  let relationship = 'none';
  let incomingReq = null;
  let chatId = null;

  if (user && currentUser) {
    // 1. Check if already connected (chat exists)
    const existingChat = chats.find(c => c.users?.includes(user.id));
    if (existingChat) {
      relationship = 'connected';
      chatId = existingChat.id;
    } else {
      // 2. Check if I sent a request
      const sent = sentRequests?.find(r => r.toId === user.id);
      if (sent) {
        relationship = 'pending';
      } else {
        // 3. Check if they sent me a request
        incomingReq = requests?.find(r => r.fromId === user.id);
        if (incomingReq) {
          relationship = 'incoming';
        }
      }
    }
  }

  const handleWave = () => {
    if (!user.isMock) {
      sendNotification(user.id, 'wave', 'Someone waved at you 👋', currentUser.id, { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      alert("Wave sent!");
    } else {
      alert("Cannot wave at a hidden user!");
    }
  };

  const handleConnect = () => {
    sendRequest(user);
    // UI will automatically update when sentRequests syncs from Firestore
  };

  const handleAccept = () => {
    if (incomingReq) {
      acceptRequest(incomingReq.id);
    }
  };

  const handleMessage = () => {
    onClose();
    navigate(`/chat/${chatId}`);
  };

  const handleQuickChat = async () => {
    // Premium fast connect - goes straight to a real chat room
    const newChatId = await createQuickChat(user);
    if (newChatId) {
      onClose();
      navigate(`/chat/${newChatId}`);
    }
  };

  const handleReport = () => {
    setIsReportModalOpen(true);
  };

  const handleBlock = () => {
    if (window.confirm(`Are you sure you want to block ${user.name}? They will no longer see you on the map.`)) {
      blockUser(user);
      alert("User blocked.");
      onClose();
    }
  };

  return (
    <div className="preview-overlay animate-fade-in" onClick={onClose}>
      <div className="preview-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}><X size={20} /></button>

        <div className="preview-content">
          <img src={user.avatar} alt={user.name} className="preview-avatar" />
          <h2 className="preview-name">{user.name}{user.age ? `, ${user.age}` : ''}</h2>
          <p className="preview-branch">{user.profession}</p>
          
          <div className="preview-stats">
            <span className="stat-pill">📍 {user.distance} away</span>
          </div>

          {/* Action Buttons */}
          <div className="preview-actions">
            {relationship === 'none' && (
              <>
                <button className="btn-primary action-btn" onClick={handleConnect}>
                  <UserPlus size={18} /> Connect
                </button>
                <button className="btn-secondary action-btn" onClick={handleWave} style={{ background: 'var(--bg-tertiary)' }}>
                  <Hand size={18} /> Wave
                </button>
              </>
            )}
            
            {relationship === 'pending' && (
              <button className="btn-secondary action-btn pending" disabled style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                Pending...
              </button>
            )}

            {relationship === 'incoming' && (
              <button className="btn-primary action-btn" onClick={handleAccept} style={{ background: 'var(--success)' }}>
                Accept Request
              </button>
            )}

            {relationship === 'connected' && (
              <button className="btn-primary action-btn" onClick={handleMessage}>
                <MessageCircle size={18} /> Message
              </button>
            )}

            {currentUser?.isPremium && relationship !== 'connected' && (
              <button className="btn-accent action-btn quick-chat" onClick={handleQuickChat}>
                <Zap size={18} fill="currentColor" /> Quick Chat
              </button>
            )}
          </div>

          {/* Anonymous Connect Toggle (Premium) */}
          {currentUser?.isPremium && relationship === 'none' && (
            <div className="anonymous-toggle">
              <label>Send anonymously 🎭</label>
              <input type="checkbox" className="toggle" />
            </div>
          )}

          {/* Safety Options Toggle */}
          <div className="safety-section">
            <button className="safety-toggle" onClick={() => setShowOptions(!showOptions)}>
              Safety Options
            </button>
            {showOptions && (
              <div className="safety-options animate-fade-in">
                <button className="safety-btn report" onClick={handleReport}><ShieldAlert size={16} /> Report</button>
                <button className="safety-btn block" onClick={handleBlock}><Ban size={16} /> Block</button>
              </div>
            )}
          </div>

        </div>
      </div>
      
      <ReportModal 
        user={user} 
        isOpen={isReportModalOpen} 
        onClose={() => {
          setIsReportModalOpen(false);
          onClose();
        }} 
      />
    </div>
  );
};

export default ProfilePreviewModal;
