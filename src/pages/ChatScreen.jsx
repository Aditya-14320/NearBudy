import { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import { ArrowLeft, Image as ImageIcon, Send, MoreVertical, Check, CheckCheck, X, Smile, ShieldAlert, Ban, Mic, Crown, Phone, Video, Camera } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useCallContext } from '../context/CallContext';
import { db, storage } from '../firebase';
import ReportModal from '../components/ReportModal';
import PremiumModal from '../components/PremiumModal';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getThumbnailUrl } from '../utils/cloudinary';
import './ChatScreen.css';

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

const getMessageGroupClass = (msg, index, items) => {
  const prev = items[index - 1];
  const next = items[index + 1];
  
  const isPrevSame = prev && prev.senderId === msg.senderId;
  const isNextSame = next && next.senderId === msg.senderId;
  
  if (isPrevSame && isNextSame) return 'group-middle';
  if (isPrevSame) return 'group-end';
  if (isNextSame) return 'group-start';
  return 'group-single';
};

// Custom Voice Message HTML5 Audio Player
const VoiceMessagePlayer = ({ audioUrl, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Playback error:", err));
      setIsPlaying(true);
    }
  };

  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    if (audioRef.current && audioRef.current.duration) {
      const newTime = (value / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(value);
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-player-container" onClick={e => e.stopPropagation()}>
      <button className="play-pause-btn" onClick={togglePlay}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <div className="player-timeline-wrapper">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress} 
          onChange={handleSliderChange} 
          className="player-slider"
        />
        <div className="player-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const ChatScreen = () => {
  const id = useParams().id;
  const navigate = useNavigate();
  const { chats, currentUser, nearbyUsers, reportUser, blockUser, sendNotification } = useAppContext();
  const { startCall } = useCallContext();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Upgraded States
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [heartPops, setHeartPops] = useState([]);

  // Removed chatTheme

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const lastTap = useRef({});

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
    
    let isOnlineStatus = false;
    let statusText = "Offline";

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
        const diff = Date.now() - activeTime;
        if (diff < 60 * 1000) { // 1 minute window for "Active now"
          isOnlineStatus = true;
          statusText = "Active now";
        } else {
          isOnlineStatus = false;
          const mins = Math.floor(diff / 60000);
          if (mins < 60) statusText = `Active ${mins}m ago`;
          else if (mins < 1440) statusText = `Active ${Math.floor(mins/60)}h ago`;
          else statusText = `Active ${Math.floor(mins/1440)}d ago`;
        }
      }
    }

    return { chatUser: fullOtherUser, isOnline: isOnlineStatus, lastActiveText: statusText };
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
          audioUrl: data.audioUrl,
          audioDuration: data.audioDuration,
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

  const lastTypingUpdate = useRef(0);

  const handleType = (val) => {
    setInputText(val);
    
    // Broadcast typing status (throttled)
    const now = Date.now();
    if (now - lastTypingUpdate.current > 1500) {
      updateDoc(doc(db, "chats", id), { typing: currentUser?.id }).catch(() => {});
      lastTypingUpdate.current = now;
    }
    
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      updateDoc(doc(db, "chats", id), { typing: null }).catch(() => {});
      lastTypingUpdate.current = 0;
    }, 2000);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !imageFile) || !currentUser || isUploading) return;

    const textToSend = inputText.trim();
    const currentFile = imageFile;
    
    // Optimistically clear the UI
    setInputText('');
    clearAttachment();
    
    if (currentFile) {
      setIsUploading(true);
      setUploadProgress(0);
    }

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

    } catch (e) {
      console.error("Error sending message:", e);
      alert("Failed to send message. Please try again.");
      // If it failed, restore the text so they don't lose it
      if (textToSend) setInputText(textToSend);
    } finally {
      if (currentFile) {
        setIsUploading(false);
        setUploadProgress(0);
      }
      scrollToBottom();
    }
  };

  // Quick Wave Hello greeting for new chats
  const handleWaveHello = async () => {
    if (!currentUser || isUploading) return;
    try {
      await addDoc(collection(db, "chats", id, "messages"), {
        text: "👋 Waved hello!",
        senderId: currentUser.id,
        seen: false,
        timestamp: serverTimestamp()
      });

      const existingChat = chats.find(c => c.id === id);
      const otherUserId = existingChat?.users?.find(uid => uid !== currentUser.id);

      const updateData = {
        lastMessage: "👋 Waved hello!",
        updatedAt: serverTimestamp(),
      };
      
      if (otherUserId) {
        updateData[`unreadCount.${otherUserId}`] = increment(1);
        sendNotification(
          otherUserId, 
          'wave', 
          'Someone waved at you 👋', 
          currentUser.id, 
          { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
        );
      }

      await updateDoc(doc(db, "chats", id), updateData);
    } catch (e) {
      console.error("Wave hello failed:", e);
    }
  };

  const handleBlockUser = async () => {
    if (window.confirm(`Are you sure you want to block ${chatUser.name}? They will no longer be able to message you.`)) {
      await blockUser(chatUser);
      alert("User blocked.");
      navigate('/chats');
    }
  };

  // Touch handlers to separate single tap from double tap
  const handleMessageTouch = (e, msgId) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current[msgId] && (now - lastTap.current[msgId] < DOUBLE_PRESS_DELAY)) {
      handleReaction(msgId, '❤️');
      
      const x = e.clientX || (e.touches && e.touches[0]?.clientX) || window.innerWidth / 2;
      const y = e.clientY || (e.touches && e.touches[0]?.clientY) || window.innerHeight / 2;
      
      triggerHeartPop(x, y);
      setSelectedMessageId(null);
    } else {
      setSelectedMessageId(prev => prev === msgId ? null : msgId);
    }
    lastTap.current[msgId] = now;
  };

  const triggerHeartPop = (x, y) => {
    const popId = Date.now() + Math.random();
    setHeartPops(prev => [...prev, { id: popId, x, y }]);
    setTimeout(() => {
      setHeartPops(prev => prev.filter(h => h.id !== popId));
    }, 800);
  };

  // Removed toggleTheme
  // Voice Note Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size > 1000) {
          await uploadAudioMessage(audioBlob, recordingTime);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone permission denied or not supported on this device.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const uploadAudioMessage = async (blob, durationSec) => {
    setIsUploading(true);
    try {
      const audioRef = ref(storage, `chat_audio/${id}/${Date.now()}.webm`);
      const uploadTask = uploadBytesResumable(audioRef, blob);
      
      const downloadURL = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      await addDoc(collection(db, "chats", id, "messages"), {
        audioUrl: downloadURL,
        audioDuration: durationSec,
        senderId: currentUser.id,
        seen: false,
        timestamp: serverTimestamp()
      });

      const existingChat = chats.find(c => c.id === id);
      const otherUserId = existingChat?.users?.find(uid => uid !== currentUser.id);

      const updateData = {
        lastMessage: `🎵 Voice Note (${formatDuration(durationSec)})`,
        updatedAt: serverTimestamp(),
      };
      
      if (otherUserId) {
        updateData[`unreadCount.${otherUserId}`] = increment(1);
      }

      await updateDoc(doc(db, "chats", id), updateData);
    } catch (e) {
      console.error("Audio upload failed:", e);
      alert("Failed to send voice note.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Group messages by day
  const grouped = [];
  messages.forEach((m) => {
    const d = dayLabel(m.dateObj);
    const last = grouped[grouped.length - 1];
    if (last?.day === d) last.items.push(m);
    else grouped.push({ day: d, items: [m] });
  });

  return (
    <div className="chat-screen animate-fade-in">
      <div className="chat-header">
        <button className="icon-btn back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        
        <div className="chat-header-user">
          <div className="header-avatar-wrapper">
            <img src={getThumbnailUrl(chatUser.avatar, 100)} alt="Avatar" className="header-avatar" />
            {isOnline && <span className="online-dot-header"></span>}
          </div>
          <div className="header-info">
            <h3>
              {chatUser.name}
              {isUserPremium(chatUser) && <VerifiedBadge />}
              {isUserPremium(chatUser) && (chatUser.premiumPlan === 'yearly' || !chatUser.premiumPlan) && (
                <span className="yearly-supporter-badge" style={{ color: '#fbbf24', marginLeft: '5px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }} title="Yearly Supporter">
                  <Crown size={14} fill="#fbbf24" />
                </span>
              )}
            </h3>
            <span className={`status ${isOnline ? 'online' : 'offline'}`}>
              {otherTyping ? "typing..." : (
                <>
                  {isOnline && <span className="online-indicator"></span>}
                  {lastActiveText}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button className="icon-btn" onClick={() => {
            if (isUserPremium(currentUser)) {
              startCall(chatUser.id, 'audio');
            } else {
              setIsPremiumModalOpen(true);
            }
          }}>
            <Phone size={22} />
          </button>
          <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MoreVertical size={22} />
          </button>
          
          {isMenuOpen && (
            <div className="header-dropdown animate-fade-in">
              <button className="dropdown-item" onClick={() => { setIsReportModalOpen(true); setIsMenuOpen(false); }}>
                <ShieldAlert size={18} /> Report User
              </button>
              <button className="dropdown-item block" onClick={() => { handleBlockUser(); setIsMenuOpen(false); }}>
                <Ban size={18} /> Block User
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="messages-container">
        {grouped.length === 0 && (
          <div className="empty-chat-container animate-fade-in">
            <div className="empty-chat-placeholder">
              <div className="empty-chat-icon">✨</div>
              <p>No messages yet. Kick off the chat with a wave!</p>
            </div>
            <button className="wave-hello-btn animate-pulse" onClick={handleWaveHello}>
              Say Hello 👋
            </button>
          </div>
        )}
        
        {grouped.map((g) => (
          <Fragment key={g.day}>
            <div className="day-separator">
              <span>{g.day}</span>
            </div>
            {g.items.map((msg, index) => {
              const groupClass = getMessageGroupClass(msg, index, g.items);
              const isSelected = selectedMessageId === msg.id;
              return (
                <div key={msg.id} className={`message-wrapper ${msg.sender} ${groupClass} animate-slide-up`}>
                  <div className="message-bubble-container">
                    {/* Touch Friendly Floating Reaction Picker */}
                    {isSelected && (
                      <div className="reaction-picker-inline animate-scale-in">
                        {['❤️', '🔥', '👋', '😂', '👍', '😮'].map(emoji => (
                          <button 
                            key={emoji} 
                            className="react-picker-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(msg.id, emoji);
                              setSelectedMessageId(null);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div 
                      className={`message-bubble ${msg.sender} ${msg.imageUrl && !msg.text ? 'image-only' : ''} ${msg.audioUrl ? 'audio-bubble' : ''}`}
                      onClick={(e) => handleMessageTouch(e, msg.id)}
                    >
                      {msg.imageUrl && (
                        <img 
                          src={msg.imageUrl} 
                          alt="attachment" 
                          className="chat-attached-image" 
                          onLoad={scrollToBottom} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(msg.imageUrl);
                          }}
                        />
                      )}
                      {msg.audioUrl && (
                        <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
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

                    {/* Inline timestamp & read status drawer toggled on select */}
                    {isSelected && (
                      <div className="message-details-inline animate-fade-in">
                        <span>{msg.dateObj ? msg.dateObj.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}</span>
                        {msg.sender === 'me' && (
                          <span className="seen-status">
                            • {msg.status === 'seen' ? 'Read' : 'Delivered'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
        
        {otherTyping && (
          <div className="message-wrapper them group-single">
            <div className="message-bubble them typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-composer-wrapper">
        {imagePreview && (
          <div className="image-preview-container animate-scale-in">
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
        
        {isRecording ? (
          <div className="recording-panel animate-scale-in">
            <button className="cancel-record-btn icon-btn" onClick={cancelRecording}>
              <X size={20} />
            </button>
            <div className="recording-indicator">
              <div className="recording-dot-glow"></div>
              <span>{formatDuration(recordingTime)}</span>
            </div>
            <button className="send-voice-btn" onClick={stopRecording}>
              <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="chat-input-area">
            <div className="input-actions-left">
              <button className="input-action-btn" onClick={() => document.getElementById('chat-image-upload').click()}>
                <Camera size={24} color="#f5f5f5" />
              </button>
              <input 
                type="file" 
                id="chat-image-upload" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleImagePick} 
              />
            </div>
            
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

            <div className="input-actions-right">
              {inputText.trim() ? (
                <button 
                  className="send-text-btn"
                  onClick={handleSend}
                  disabled={isUploading}
                >
                  Send
                </button>
              ) : (
                <>
                  <button className="input-action-btn" onClick={startRecording}>
                    <Mic size={24} color="#f5f5f5" />
                  </button>
                  <button className="input-action-btn" onClick={() => document.getElementById('chat-image-upload').click()}>
                    <ImageIcon size={24} color="#f5f5f5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <p className="ugc-notice">Keep it respectful. All content is moderated.</p>
      </div>

      {/* Screen Space Double-Tap Like heart bubbles */}
      {heartPops.map(h => (
        <span 
          key={h.id} 
          className="heart-pop-animation" 
          style={{ left: h.x - 24, top: h.y - 24 }}
        >
          ❤️
        </span>
      ))}

      {/* Full Screen Image Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay animate-fade-in" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close-btn" onClick={() => setLightboxImage(null)}>
            <X size={28} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full Preview" 
            className="lightbox-image animate-scale-in" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}

      <ReportModal 
        user={chatUser} 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />

      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
      />
    </div>
  );
};

export default ChatScreen;
