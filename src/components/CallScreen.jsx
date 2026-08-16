import React, { useEffect, useRef, useState } from 'react';
import { useCallContext } from '../context/CallContext';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getThumbnailUrl } from '../utils/cloudinary';
import './CallScreen.css';

const CallScreen = () => {
  const { 
    callData, 
    localStream, 
    remoteStream, 
    answerCall, 
    declineCall, 
    endCall,
    toggleAudio
  } = useCallContext();
  
  const { nearbyUsers, currentUser } = useAppContext();
  
  const remoteAudioRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call Timer logic
  useEffect(() => {
    let interval;
    if (callData?.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callData?.status]);

  if (!callData) return null;

  // Determine if we are receiving the call
  const isReceiving = callData.receiverId === currentUser?.id;
  const otherUserId = isReceiving ? callData.callerId : callData.receiverId;
  const otherUser = nearbyUsers.find(u => u.id === otherUserId) || { name: 'Unknown User', avatar: 'https://i.pravatar.cc/150' };

  const handleMute = () => {
    toggleAudio(isMuted); // If currently muted, we want to enable (true)
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-screen-overlay">
      {/* Blurred background using caller's avatar */}
      <div 
        className="call-background-blur" 
        style={{ backgroundImage: `url(${getThumbnailUrl(otherUser.avatar, 300)})` }}
      ></div>

      {callData.status === 'ringing' && isReceiving && (
        <div className="incoming-call-container">
          <img src={getThumbnailUrl(otherUser.avatar, 200)} alt={otherUser.name} className="call-avatar" />
          <div className="call-info">
            <h2>{otherUser.name}</h2>
            <p>Incoming Voice Call...</p>
          </div>
          <div className="call-actions">
            <button className="call-btn decline" onClick={declineCall}>
              <PhoneOff size={28} />
            </button>
            <button className="call-btn accept" onClick={answerCall}>
              <Phone size={28} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {callData.status === 'ringing' && !isReceiving && (
        <div className="incoming-call-container">
          <img src={getThumbnailUrl(otherUser.avatar, 200)} alt={otherUser.name} className="call-avatar" />
          <div className="call-info">
            <h2>{otherUser.name}</h2>
            <p>Ringing...</p>
          </div>
          <div className="call-actions">
            <button className="call-btn decline" onClick={endCall}>
              <PhoneOff size={28} />
            </button>
          </div>
        </div>
      )}

      {callData.status === 'connected' && (
        <div className="active-call-container animate-fade-in">
          
          <div className="voice-call-centered">
            <div className="avatar-pulse-wrapper">
              <img src={getThumbnailUrl(otherUser.avatar, 200)} alt={otherUser.name} className="call-avatar active-pulse" />
              <div className="pulse-ring ring-1"></div>
              <div className="pulse-ring ring-2"></div>
            </div>
            
            <div className="call-info connected-info">
              <h2>{otherUser.name}</h2>
              <p className="call-timer">{formatTime(callDuration)}</p>
            </div>
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

          <div className="active-call-controls">
            <button className={`control-btn ${isMuted ? 'muted' : ''}`} onClick={handleMute}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            <button className="control-btn end" onClick={endCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallScreen;
