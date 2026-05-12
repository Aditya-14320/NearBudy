import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import './ChatsPage.css';

const ChatsPage = () => {
  const navigate = useNavigate();
  const { chats, currentUser, nearbyUsers } = useAppContext();

  return (
    <div className="chats-page-container animate-fade-in">
      <div className="chats-header">
        <h2>Messages</h2>
      </div>

      <div className="chats-content">
        {chats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-circle">
              <MessageCircle size={32} className="empty-icon" />
            </div>
            <h3>No chats yet</h3>
            <p>Find nearby people on the map to start chatting!</p>
          </div>
        ) : (
          <div className="chats-list">
            {chats.map(chat => {
              const otherUserId = chat.users?.find(id => id !== currentUser?.id);
              const otherUser = otherUserId ? chat.userDetails?.[otherUserId] : null;
              if (!otherUser) return null;
              
              const fullOtherUser = nearbyUsers?.find(u => u.id === otherUserId) || otherUser;
              let isOnline = false;
              if (fullOtherUser.lastActive) {
                let activeTime = 0;
                if (typeof fullOtherUser.lastActive.toMillis === 'function') activeTime = fullOtherUser.lastActive.toMillis();
                else if (fullOtherUser.lastActive.seconds) activeTime = fullOtherUser.lastActive.seconds * 1000;
                else if (typeof fullOtherUser.lastActive === 'number') activeTime = fullOtherUser.lastActive;
                
                // eslint-disable-next-line react-hooks/purity
                if (activeTime > 0 && (Date.now() - activeTime) < 5 * 60 * 1000) {
                  isOnline = true;
                }
              }
              const unreadCount = chat.unreadCount?.[currentUser?.id] || 0;

              return (
                <div key={chat.id} className="chat-item" onClick={() => navigate(`/chat/${chat.id}`)}>
                  <div className="chat-avatar-wrapper">
                    <img src={fullOtherUser.avatar} alt="Avatar" className="chat-avatar" />
                    {isOnline && <span className="online-dot-list"></span>}
                  </div>
                  <div className="chat-details">
                    <div className="chat-name-time">
                      <h4>{fullOtherUser.name}</h4>
                      <span>{chat.updatedAt ? "Recent" : "Just now"}</span>
                    </div>
                    <div className="chat-msg-badge">
                      <p className={unreadCount > 0 ? 'unread-text' : ''}>{chat.lastMessage}</p>
                      {unreadCount > 0 && <span className="unread-pill">{unreadCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;
