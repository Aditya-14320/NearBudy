import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, MessageCircle, Search, Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getThumbnailUrl } from '../utils/cloudinary';
import './Connections.css';

const Connections = () => {
  const { currentUser, nearbyUsers, chats } = useAppContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const friends = useMemo(() => {
    if (!currentUser || !chats) return [];
    
    // Find all users I have a chat with
    const connectedIds = chats.flatMap(c => c.users || []).filter(id => id !== currentUser.id);
    const uniqueIds = [...new Set(connectedIds)];
    
    return uniqueIds.map(id => {
      const fullUser = nearbyUsers.find(u => u.id === id);
      const chat = chats.find(c => c.users?.includes(id));
      
      return {
        ...(fullUser || { id, name: "NearBudy User", avatar: "/avatars/neutral.png", profession: "Connected" }),
        chatId: chat?.id,
        isOnline: fullUser?.lastActive ? (Date.now() - fullUser.lastActive.toMillis() < 10 * 60 * 1000) : false
      };
    }).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
  }, [currentUser, chats, nearbyUsers]);

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.profession?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="connections-page animate-fade-in">
      <div className="top-header">
        <button className="icon-btn" onClick={() => navigate('/profile')}>
          <ArrowLeft size={24} />
        </button>
        <h2>My Circle</h2>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="search-container">
        <div className="search-bar-new">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search connections..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="connections-list">
        {filteredFriends.length === 0 ? (
          <div className="empty-state">
            <Users size={64} strokeWidth={1} color="var(--text-tertiary)" />
            <h3>No connections yet</h3>
            <p>Start waving at people nearby to grow your circle!</p>
            <button className="btn-primary" onClick={() => navigate('/home')} style={{ marginTop: 20 }}>
              Discover People
            </button>
          </div>
        ) : (
          filteredFriends.map(friend => (
            <div key={friend.id} className="friend-card animate-slide-up">
              <div className="friend-avatar-box">
                <img src={getThumbnailUrl(friend.avatar, 100)} alt={friend.name} className="friend-avatar" />
                {friend.isOnline && <div className="online-indicator"></div>}
              </div>
              <div className="friend-info">
                <h4>{friend.name}</h4>
                <p>{friend.profession}</p>
              </div>
              <div className="friend-actions">
                <button className="chat-btn-circle" onClick={() => navigate(`/chat/${friend.chatId}`)}>
                  <MessageCircle size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Connections;
