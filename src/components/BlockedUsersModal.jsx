import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './BlockedUsersModal.css';

const BlockedUsersModal = ({ isOpen, onClose }) => {
  const { currentUser, unblockUser } = useAppContext();

  if (!isOpen) return null;

  const blockedList = currentUser?.blocked || [];

  return (
    <div className="blocked-overlay animate-fade-in" onClick={onClose}>
      <div className="blocked-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="blocked-header">
          <h2>Blocked Users</h2>
          <button className="icon-btn close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="blocked-list">
          {blockedList.length === 0 ? (
            <div className="empty-blocked">
              <p>You haven't blocked anyone.</p>
            </div>
          ) : (
            blockedList.map(user => (
              <div key={user.id} className="blocked-item">
                <img src={user.avatar} alt={user.name} className="blocked-avatar" />
                <span className="blocked-name">{user.name}</span>
                <button 
                  className="btn-unblock"
                  onClick={() => unblockUser(user.id)}
                >
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersModal;
