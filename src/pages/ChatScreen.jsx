import { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import { ArrowLeft, Image as ImageIcon, Send, MoreVertical, Check, CheckCheck, X, Smile } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { db, storage } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import './ChatScreen.css';

const dayLabel = (dateObj) => {
  if (!dateObj) return "Just now";
  const d = dateObj;
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const ChatScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { chats, currentUser, nearbyUsers } = useAppContext();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { chatUser, isOnline, lastActiveText } = useMemo(() => {
    const fallback = { name: "User", avatar: "https://i.pravatar.cc/150" };
    const existingChat = chats.find(c => c.id === id);
    if (!existingChat || !currentUser) {
      return { chatUser: fallback, isOnline: false, lastActiveText: "Offline" };
    }

    const otherUserId = existingChat.users?.find(uid => uid !== currentUser.id);
    if (!otherUserId) {
      return { chatUser: fallback, isOnline: false, lastActiveText: "Offline" };
    }

    const fullOtherUser = nearbyUsers.find(u => u.id === otherUserId) || existingChat.userDetails?.[otherUserId] || fallback;
    
    let isOnline;
    let lastActiveText;

    if (fullOtherUser.lastActive) {
      let activeTime = 0;
      if (typeof fullOtherUser.lastActive.toMillis === 'function') {
        activeTime = fullOtherUser.lastActive.toMillis();
      } else if (fullOtherUser.lastActive.seconds) {
        activeTime = fullOtherUser.lastActive.seconds * 1000;
      } else if (typeof fullOtherUser.lastActive === 'number') {
        activeTime = fullOtherUser.lastActive;
      }

      if (activeTime > 0) {
        // eslint-disable-next-line react-hooks/purity
        const diff = Date.now() - activeTime;
        if (diff < 5 * 60 * 1000) {
          isOnline = true;
          lastActiveText = "Active now";
        } else {
          isOnline = false;
          const mins = Math.floor(diff / 60000);
          if (mins < 60) lastActiveText = `Seen ${mins}m ago`;
          else if (mins < 1440) lastActiveText = `Seen ${Math.floor(mins/60)}h ago`;
          else lastActiveText = `Seen ${Math.floor(mins/1440)}d ago`;
        }
      } else {
        isOnline = true;
        lastActiveText = "Active now";
      }
    } else {
      isOnline = true;
      lastActiveText = "Active now"; // Fallback
    }

    return { chatUser: fullOtherUser, isOnline, lastActiveText };
  }, [id, chats, currentUser, nearbyUsers]);

  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    // Listen to messages
    const q = query(collection(db, "chats", id, "messages"), orderBy("timestamp", "asc"));
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = data.timestamp && typeof data.timestamp.toDate === 'function' ? new Date(data.timestamp.toDate()) : null;
        return {
          id: doc.id,
          text: data.text,
          imageUrl: data.imageUrl,
          senderId: data.senderId,
          sender: data.senderId === currentUser?.id ? 'me' : 'them',
          time: dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          dateObj: dateObj,
          seen: data.seen || false,
          status: data.seen ? 'seen' : 'sent',
          reaction: data.reaction || null
        };
      });
      setMessages(loadedMessages);
    });

    // Listen to chat doc for typing indicator
    const unsubscribeChat = onSnapshot(doc(db, "chats", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.typing && data.typing !== currentUser?.id) {
          setOtherTyping(true);
        } else {
          setOtherTyping(false);
        }
      }
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeChat();
      clearTimeout(typingTimer.current);
    };
  }, [id, currentUser]);

  // Auto-mark unseen messages as seen and reset unread count
  useEffect(() => {
    if (!currentUser || !id) return;

    // Immediately reset unread count to 0 for current user
    updateDoc(doc(db, "chats", id), {
      [`unreadCount.${currentUser.id}`]: 0
    }).catch(console.error);

    messages.forEach(m => {
      if (m.sender === 'them' && !m.seen) {
        updateDoc(doc(db, "chats", id, "messages", m.id), { seen: true }).catch(console.error);
      }
    });
  }, [messages, id, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview, otherTyping]);

  const handleReaction = async (msgId, reactionStr) => {
    try {
      await updateDoc(doc(db, "chats", id, "messages", msgId), {
        reaction: reactionStr
      });
    } catch(e) { console.error(e) }
  };

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Only images are supported");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
        setTimeout(scrollToBottom, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setImagePreview(null);
    setImageFile(null);
    setUploadProgress(0);
  };

  const handleType = (val) => {
    setInputText(val);
    
    // Broadcast typing status
    updateDoc(doc(db, "chats", id), { typing: currentUser?.id }).catch(() => {});
    
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      updateDoc(doc(db, "chats", id), { typing: null }).catch(() => {});
    }, 2000);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !imageFile) || !currentUser || isUploading) return;

    const textToSend = inputText.trim();
    const currentFile = imageFile;
    
    setIsUploading(true);
    setUploadProgress(0);

    // Clear typing status immediately when sending
    clearTimeout(typingTimer.current);
    updateDoc(doc(db, "chats", id), { typing: null }).catch(() => {});

    try {
      let uploadedUrl = null;
      
      if (currentFile) {
        const imgRef = ref(storage, `chat_images/${id}/${Date.now()}_${currentFile.name}`);
        const uploadTask = uploadBytesResumable(imgRef, currentFile);
        
        uploadedUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }

      await addDoc(collection(db, "chats", id, "messages"), {
        text: textToSend,
        imageUrl: uploadedUrl,
        senderId: currentUser.id,
        seen: false,
        timestamp: serverTimestamp()
      });

      const existingChat = chats.find(c => c.id === id);
      const otherUserId = existingChat?.users?.find(uid => uid !== currentUser.id);

      const updateData = {
        lastMessage: uploadedUrl ? "📷 Photo" : textToSend,
        updatedAt: serverTimestamp(),
      };
      
      if (otherUserId) {
        updateData[`unreadCount.${otherUserId}`] = increment(1);
      }

      await updateDoc(doc(db, "chats", id), updateData);

      setInputText('');
      clearAttachment();
    } catch (e) {
      console.error("Error sending message:", e);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      scrollToBottom();
    }
  };

  // Group by day
  const grouped = [];
  messages.forEach((m) => {
    const d = dayLabel(m.dateObj);
    const last = grouped[grouped.length - 1];
    if (last?.day === d) last.items.push(m);
    else grouped.push({ day: d, items: [m] });
  });

  return (
    <div className="chat-screen animate-fade-in">
      <div className="chat-header glass-panel">
        <button className="icon-btn back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="chat-header-user">
          <div className="header-avatar-wrapper">
            <img src={chatUser.avatar} alt="Avatar" className="header-avatar" />
            {isOnline && <span className="online-dot-header"></span>}
          </div>
          <div className="header-info">
            <h3>{chatUser.name}</h3>
            <span className={`status ${isOnline ? 'online' : 'offline'}`}>{otherTyping ? "Typing..." : lastActiveText}</span>
          </div>
        </div>
        <button className="icon-btn">
          <MoreVertical size={24} />
        </button>
      </div>

      <div className="messages-container">
        {grouped.map((g) => (
          <Fragment key={g.day}>
            <div className="day-separator">
              <span>{g.day}</span>
            </div>
            {g.items.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.sender} animate-slide-up`}>
                <div className={`message-bubble ${msg.sender} ${msg.imageUrl && !msg.text ? 'image-only' : ''}`}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="attachment" className="chat-attached-image" onLoad={scrollToBottom} />
                  )}
                  {msg.text && <p>{msg.text}</p>}
                  <div className="message-meta">
                    <span className="message-time">{msg.time}</span>
                    {msg.sender === 'me' && (
                      <span className="message-status">
                        {msg.status === 'seen' ? <CheckCheck size={14} className="tick-seen" /> : <Check size={14} className="tick-sent" />}
                      </span>
                    )}
                  </div>
                  {msg.reaction && <div className="msg-reaction-badge animate-scale-in">{msg.reaction}</div>}
                </div>
                
                {msg.sender === 'them' && (
                  <div className="reaction-picker-mini">
                    {['❤️', '🔥', '👋', '😂'].map(r => (
                      <button key={r} onClick={() => handleReaction(msg.id, r)} className="react-btn">{r}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Fragment>
        ))}
        {otherTyping && (
          <div className="message-wrapper them">
            <div className="message-bubble them typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-composer-wrapper glass-panel">
        {imagePreview && (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Preview" className="composer-img-preview" />
            {!isUploading && (
              <button className="remove-img-btn" onClick={clearAttachment}>
                <X size={16} />
              </button>
            )}
            {isUploading && (
              <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            )}
          </div>
        )}
        
        <div className="chat-input-area">
          <button className="icon-btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <ImageIcon size={22} />
          </button>
          
          <div className="input-glass-wrapper">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImagePick} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <textarea 
              className="chat-input" 
              placeholder="Message..." 
              value={inputText}
              rows={1}
              onChange={(e) => {
                handleType(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={scrollToBottom}
              disabled={isUploading}
            />
            <button className="icon-btn-secondary emoji-btn" disabled={isUploading}>
              <Smile size={22} />
            </button>
          </div>

          <button 
            className={`send-btn ${(inputText.trim() || imageFile) && !isUploading ? 'active' : ''}`} 
            onClick={handleSend}
            disabled={isUploading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
