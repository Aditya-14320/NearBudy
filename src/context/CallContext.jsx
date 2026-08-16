import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { useAppContext } from './AppContext';

const CallContext = createContext();

export const useCallContext = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { currentUser, nearbyUsers } = useAppContext();

  const [callData, setCallData] = useState(null); // { id, callerId, receiverId, type, status }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const peerConnection = useRef(null);
  const unsubscribeCall = useRef(null);
  
  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;
    
    // Listen for calls where user is the receiver and status is ringing
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.id),
      where('status', '==', 'ringing')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setCallData({ id: change.doc.id, ...data });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Clean up function
  const endCall = async () => {
    if (callData?.id) {
      // Set status to ended in firestore
      try {
        await updateDoc(doc(db, 'calls', callData.id), { status: 'ended' });
      } catch (e) {
        console.error("Error updating call status to ended", e);
      }
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setCallData(null);
    if (unsubscribeCall.current) {
      unsubscribeCall.current();
      unsubscribeCall.current = null;
    }
  };

  const startCall = async (receiverId, type) => {
    if (!currentUser) return;

    try {
      // Get Media with advanced audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);

      // Create new call document
      const callDoc = doc(collection(db, 'calls'));
      
      const newCallData = {
        callerId: currentUser.id,
        receiverId,
        type,
        status: 'ringing'
      };
      
      await setDoc(callDoc, newCallData);
      setCallData({ id: callDoc.id, ...newCallData });

      // Setup PC
      peerConnection.current = new RTCPeerConnection(servers);
      
      // Add local stream tracks to PC
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Setup Remote Stream
      const rStream = new MediaStream();
      setRemoteStream(rStream);

      peerConnection.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rStream.addTrack(track);
        });
      };

      // Handle ICE Candidates (Caller)
      const callerCandidatesCollection = collection(callDoc, 'callerCandidates');
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(callerCandidatesCollection, event.candidate.toJSON());
        }
      };

      // Create Offer
      const offerDescription = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await updateDoc(callDoc, { offer });

      // Listen for Answer
      unsubscribeCall.current = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        
        if (data.status === 'ended' || data.status === 'declined') {
          endCall();
          return;
        }

        if (peerConnection.current && !peerConnection.current.currentRemoteDescription && data.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          peerConnection.current.setRemoteDescription(answerDescription);
          setCallData(prev => ({ ...prev, status: 'connected' }));
        }
      });

      // Listen for Receiver ICE Candidates
      const receiverCandidatesCollection = collection(callDoc, 'receiverCandidates');
      onSnapshot(receiverCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.current?.addIceCandidate(candidate);
          }
        });
      });

    } catch (error) {
      console.error("Failed to start call:", error);
      endCall();
    }
  };

  const answerCall = async () => {
    if (!callData) return;
    
    try {
      // Get Media with advanced audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);
      
      const callDoc = doc(db, 'calls', callData.id);
      const callDataSnap = await getDoc(callDoc);
      const callDocData = callDataSnap.data();

      // Setup PC
      peerConnection.current = new RTCPeerConnection(servers);
      
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      const rStream = new MediaStream();
      setRemoteStream(rStream);

      peerConnection.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          rStream.addTrack(track);
        });
      };

      // Handle ICE Candidates (Receiver)
      const receiverCandidatesCollection = collection(callDoc, 'receiverCandidates');
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(receiverCandidatesCollection, event.candidate.toJSON());
        }
      };

      // Set Remote Description from Offer
      const offerDescription = callDocData.offer;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

      // Create Answer
      const answerDescription = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answerDescription);

      const answer = {
        sdp: answerDescription.sdp,
        type: answerDescription.type,
      };

      await updateDoc(callDoc, { answer, status: 'connected' });
      setCallData(prev => ({ ...prev, status: 'connected' }));

      // Listen for Caller ICE Candidates
      const callerCandidatesCollection = collection(callDoc, 'callerCandidates');
      onSnapshot(callerCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.current?.addIceCandidate(candidate);
          }
        });
      });

      // Listen for end call
      unsubscribeCall.current = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          endCall();
        }
      });

    } catch (error) {
      console.error("Error answering call", error);
      endCall();
    }
  };

  const declineCall = async () => {
    if (callData?.id) {
      try {
        await updateDoc(doc(db, 'calls', callData.id), { status: 'declined' });
      } catch (e) {}
    }
    endCall();
  };
  
  const toggleAudio = (state) => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = state;
    }
  }

  const value = {
    callData,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleAudio
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
