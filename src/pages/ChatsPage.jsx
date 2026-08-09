import { useState, useMemo } from 'react';
import { MessageCircle, Search, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getThumbnailUrl } from '../utils/cloudinary';
import './ChatsPage.css';

const isUserOnline = (user) => {
  if (!user) return false;
  if (user.isMock) return user.name.length % 2 === 0;
  if (!user.lastActive) return false;
  try {
    const activeTime = user.lastActive.toMillis ? user.lastActive.toMillis() : new Date(user.lastActive).getTime();
    return Date.now() - activeTime < 5 * 60 * 1000;
  } catch (e) {
    return false;
  }
};

const isUserPremium = (user) => {
  if (!user) return false;
  if (!user.isPremium) return false;
  if (!user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
};

const VerifiedBadge = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="15" 
    height="15" 
    className="premium-verified-badge" 
    style={{ color: '#3b82f6', fill: 'currentColor', marginLeft: '5px', verticalAlign: 'middle', display: 'inline-block', flexShrink: 0 }}
  >
    <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7 3.1 5.52l.34 3.7L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const formatChatTime = (timestamp) => {
  if (!timestamp) return "Just now";
  try {
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    
    const yest = new Date();
    yest.setDate(now.getDate() - 1);
    if (dateObj.toDateString() === yest.toDateString()) return "Yesterday";
    
    return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return "Recent";
  }
};

const ChatsPage = () => {
  const navigate = useNavigate();
  const { chats, currentUser, nearbyUsers } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  // Active online contacts for the top bar
  const onlineContacts = useMemo(() => {
    if (!currentUser) return [];
    return chats.map(chat => {
      const otherUserId = chat.users?.find(id => id !== currentUser.id);
      const otherUser = otherUserId ? chat.userDetails?.[otherUserId] : null;
      if (!otherUser) return null;
      const fullOtherUser = nearbyUsers?.find(u => u.id === otherUserId) || { ...otherUser, id: otherUserId };
      return {
        chatId: chat.id,
        user: fullOtherUser
      };
    }).filter(contact => contact && isUserOnline(contact.user));
  }, [chats, currentUser, nearbyUsers]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const queryStr = searchQuery.toLowerCase().trim();
    return chats.filter(chat => {
      const otherUserId = chat.users?.find(id => id !== currentUser?.id);
      const otherUser = otherUserId ? chat.userDetails?.[otherUserId] : null;
      if (!otherUser) return false;
      const fullOtherUser = nearbyUsers?.find(u => u.id === otherUserId) || { ...otherUser, id: otherUserId };
      
      return (
        fullOtherUser.name?.toLowerCase().includes(queryStr) ||
        (typeof chat.lastMessage === 'string' && chat.lastMessage.toLowerCase().includes(queryStr))
      );
    });
  }, [chats, searchQuery, currentUser, nearbyUsers]);

  return (
    <div className="chats-page-container animate-fade-in">
      <div className="chats-header">
        <h2>Chats</h2>
        <div className="search-inbox-wrapper">
          <Search size={18} className="search-inbox-icon" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-inbox-input"
          />
        </div>
      </div>

      <div className="chats-content">
        {onlineContacts.length > 0 && !searchQuery && (
          <div className="active-stories-section">
            <div className="active-stories-row">
              {onlineContacts.map(contact => (
                <div 
                  key={contact.user.id} 
                  className="story-bubble"
                  onClick={() => navigate(`/chat/${contact.chatId}`)}
                >
                  <div className="story-avatar-wrapper">
                    <img src={getThumbnailUrl(contact.user.avatar, 100)} alt={contact.user.name} />
                    <span className="story-online-dot"></span>
                  </div>
                  <span>{contact.user.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-circle">
              <MessageCircle size={32} className="empty-icon" />
            </div>
            <h3>No messages</h3>
            <p>{searchQuery ? "No matching chats found." : "Say hi to someone nearby on the map!"}</p>
          </div>
        ) : (
          <div className="chats-list">
            {filteredChats.map(chat => {
              const otherUserId = chat.users?.find(id => id !== currentUser?.id);
              const otherUser = otherUserId ? chat.userDetails?.[otherUserId] : null;
              if (!otherUser) return null;
              
              const fullOtherUser = nearbyUsers?.find(u => u.id === otherUserId) || { ...otherUser, id: otherUserId };
              const isOnline = isUserOnline(fullOtherUser);
              const unreadCount = chat.unreadCount?.[currentUser?.id] || 0;

              return (
                <div key={chat.id} className="chat-item" onClick={() => navigate(`/chat/${chat.id}`)}>
                  <div className="chat-avatar-wrapper">
                    <img src={getThumbnailUrl(fullOtherUser.avatar, 80)} alt="Avatar" className="chat-avatar" />
                    {isOnline && <span className="online-dot-list"></span>}
                  </div>
                  <div className="chat-details">
                    <div className="chat-name-time">
                      <h4>
                        {fullOtherUser.name}
                        {isUserPremium(fullOtherUser) && <VerifiedBadge />}
                        {isUserPremium(fullOtherUser) && (fullOtherUser.premiumPlan === 'yearly' || !fullOtherUser.premiumPlan) && (
                          <span className="yearly-supporter-badge" style={{ color: '#fbbf24', marginLeft: '5px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }} title="Yearly Supporter">
                            <Crown size={12} fill="#fbbf24" />
                          </span>
                        )}
                      </h4>
                      <span className={unreadCount > 0 ? "time-unread" : "time-read"}>{formatChatTime(chat.updatedAt)}</span>
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

