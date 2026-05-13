import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth, db, setPersistence, browserLocalPersistence } from '../firebase';
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, query, where, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { deleteUser, signInAnonymously, linkWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
// Capacitor plugins will be imported dynamically to prevent web build errors

/* eslint-disable react-refresh/only-export-components */
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Global Data
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [chats, setChats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const notifiedRefs = useRef(new Set());
  const signingInAsGuest = useRef(false);
  const [sessionViews, setSessionViews] = useState(new Set());
  const [skippedUsers, setSkippedUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('skipped_users');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Save login type
        localStorage.setItem('nb_auth_type', user.isAnonymous ? 'guest' : 'google');
        
        // Fetch profile from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          const guestId = Math.floor(1000 + Math.random() * 9000);
          const guestName = user.displayName || `Guest_${guestId}`;
          const guestAvatar = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${guestName}`;
          const referralCode = `NB${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          const guestData = {
            id: user.uid,
            name: guestName,
            username: user.displayName ? user.displayName.toLowerCase().replace(/\s+/g, '') : `guest_${guestId}`,
            avatar: guestAvatar,
            isGuest: user.isAnonymous,
            isPremium: false,
            referralCode: referralCode,
            lat: 28.6304,
            lng: 77.2177,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, "users", user.uid), guestData);
          setCurrentUser(guestData);
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Live location tracking
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Only update if distance moved is significant (e.g. > 10m) to save DB writes
        const dist = getRawDistance(currentUser.lat, currentUser.lng, latitude, longitude);
        if (dist > 0.01) { // 10 meters
           try {
             await updateDoc(doc(db, "users", currentUser.id), {
               lat: latitude,
               lng: longitude
             });
           } catch (e) { console.error("Live location update failed", e); }
        }
      },
      (err) => console.error("Location watch error", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser?.id]); // Only re-run if ID changes

  // Haversine distance calc
  const getDistanceFormatted = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "Nearby";
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // distance in km
    
    const meters = d * 1000;
    if (meters < 50) return "Very Close";
    if (meters < 300) return `${Math.floor(meters)}m`;
    if (meters < 1000) return "Nearby";
    return d.toFixed(1) + "km";
  };

  const getRawDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    // Listen to all real users in the database
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let realUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        const userLat = data.lat || 28.6304;
        const userLng = data.lng || 77.2177;

        return {
          ...data,
          id: doc.id,
          lat: userLat,
          lng: userLng,
          rawDistance: currentUser ? getRawDistance(currentUser.lat, currentUser.lng, userLat, userLng) : 999999,
          distance: currentUser ? getDistanceFormatted(currentUser.lat, currentUser.lng, userLat, userLng) : "Nearby",
          isLocked: false
        };
      });

      // Filter out current user and sort by distance
      realUsers = realUsers
        .filter(u => u.id !== currentUser?.id)
        .sort((a, b) => a.rawDistance - b.rawDistance);

      setNearbyUsers(realUsers);
    });

    return () => unsubscribeUsers();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      setTimeout(() => {
        setRequests([]);
        setChats([]);
      }, 0);
      return;
    }

    // Listen for incoming requests
    const qReq = query(collection(db, "requests"), where("toId", "==", currentUser.id), where("status", "==", "pending"));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen for sent requests
    const qSent = query(collection(db, "requests"), where("fromId", "==", currentUser.id), where("status", "==", "pending"));
    const unsubSent = onSnapshot(qSent, (snapshot) => {
      setSentRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen for chats
    const qChats = query(collection(db, "chats"), where("users", "array-contains", currentUser.id));
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const rawChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Deduplicate in case of old dirty data
      const uniqueChats = [];
      const seenPairs = new Set();
      for (const chat of rawChats) {
        if (!chat.users || chat.users.length < 2) continue;
        const pairKey = [...chat.users].sort().join('_');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          uniqueChats.push(chat);
        }
      }
      
      // Client-side sort by updatedAt descending to ensure newest are first
      uniqueChats.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setChats(uniqueChats);
    });

    // Request Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Listen for smart notifications
    const qNotifs = query(collection(db, "notifications"), where("userId", "==", currentUser.id));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      notifsData.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      setNotifications(notifsData);

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const isOld = data.timestamp && data.timestamp.toMillis() < Date.now() - 60000; // Older than 1 minute
          if (!isOld && !data.read && !notifiedRefs.current.has(change.doc.id)) {
            notifiedRefs.current.add(change.doc.id);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("CamChat", { body: data.message, icon: "/favicon.ico" });
            }
          }
        }
      });
    });

    return () => {
      unsubReq();
      unsubSent();
      unsubChats();
      unsubNotifs();
    };
  }, [currentUser]);

  // Update Presence (lastActive)
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const updatePresence = () => {
      if (document.visibilityState === 'visible') {
        updateDoc(doc(db, "users", currentUser.id), {
          lastActive: serverTimestamp()
        }).catch(() => {});
      }
    };

    updatePresence();
    document.addEventListener("visibilitychange", updatePresence);
    return () => document.removeEventListener("visibilitychange", updatePresence);
  }, [currentUser?.id]);

  // Native Push Notifications
  useEffect(() => {
    if (!currentUser?.id) return;
    
    if (Capacitor.isNativePlatform()) {
      const setupPush = async () => {
        try {
          // Dynamic imports for native plugins
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const { LocalNotifications } = await import('@capacitor/local-notifications');

          let permStatus = await PushNotifications.checkPermissions();

          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive !== 'granted') {
            console.log('User denied push notification permission');
            return;
          }

          await PushNotifications.register();

          PushNotifications.addListener('registration', (token) => {
            updateDoc(doc(db, "users", currentUser.id), {
              fcmToken: token.value
            }).catch(console.error);
          });

          PushNotifications.addListener('registrationError', (error) => {
            console.error('Error on registration: ', error);
          });

          PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            console.log('Push received: ', notification);
            // Show a local notification if the app is in the foreground
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || "NearBudy",
                  body: notification.body || "",
                  id: Date.now(),
                  extra: notification.data
                }
              ]
            });
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            const data = notification.notification.data;
            if (data && data.chatId) {
              window.location.href = `/chat/${data.chatId}`;
            }
          });
        } catch (error) {
          console.error("Error setting up push notifications:", error);
        }
      };
      
      setupPush();
      
      return () => {
        const cleanup = async () => {
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            PushNotifications.removeAllListeners();
          } catch {
            // Ignore
          }
        };
        cleanup();
      };
    }
  }, [currentUser?.id]);

  // Actions
  const sendRequest = async (targetUser) => {
    if (!currentUser) return;
    
    if (currentUser.isGuest) {
      alert("Guests cannot send requests. Please upgrade to a Google account to chat!");
      return;
    }

    if (sentRequests.some(r => r.toId === targetUser.id)) {
      alert("You already sent a request to this user.");
      return;
    }

    const isPremium = currentUser.isPremium || (currentUser.premiumUntil && currentUser.premiumUntil > Date.now());
    let recentRequests = currentUser.requestHistory || [];
    
    if (!isPremium) {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      recentRequests = recentRequests.filter(timestamp => timestamp > twentyFourHoursAgo);

      if (recentRequests.length >= 10) {
        alert("You've reached your daily limit of 10 requests. Upgrade to Pro for unlimited requests!");
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      
      const newReqRef = doc(collection(db, "requests"));
      batch.set(newReqRef, {
        fromId: currentUser.id,
        toId: targetUser.id,
        status: 'pending',
        fromUser: {
          name: currentUser.name,
          avatar: currentUser.avatar,
          profession: currentUser.profession || ''
        },
        timestamp: serverTimestamp()
      });

      const newHistory = [...recentRequests, Date.now()];
      const userRef = doc(db, "users", currentUser.id);
      batch.update(userRef, { requestHistory: newHistory });

      await batch.commit();
      setCurrentUser(prev => ({ ...prev, requestHistory: newHistory }));
    } catch (e) {
      console.error("Error sending request:", e);
    }
  };

  const acceptRequest = async (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    try {
      const batch = writeBatch(db);
      
      // 1. Delete request
      const reqRef = doc(db, "requests", reqId);
      batch.delete(reqRef);
      
      // 2. Create Chat Room with deterministic ID
      const chatId = [req.fromId, req.toId].sort().join('_');
      const newChatRef = doc(db, "chats", chatId);
      batch.set(newChatRef, {
        users: [req.fromId, req.toId],
        userDetails: {
          [req.fromId]: { name: req.fromUser.name, avatar: req.fromUser.avatar },
          [req.toId]: { name: currentUser.name, avatar: currentUser.avatar }
        },
        lastMessage: "Connection accepted! Say hi.",
        updatedAt: serverTimestamp(),
        unreadCount: { [req.fromId]: 1, [req.toId]: 0 }
      }, { merge: true });
      
      await batch.commit();
    } catch (e) {
      console.error("Error accepting request:", e);
    }
  };

  const rejectRequest = async (reqId) => {
    try {
      await deleteDoc(doc(db, "requests", reqId));
    } catch (e) {
      console.error("Error rejecting request:", e);
    }
  };

  const blockUser = async (targetUser) => {
    if (!currentUser) return;
    try {
      const newBlocked = [...(currentUser.blocked || []), { id: targetUser.id, name: targetUser.name, avatar: targetUser.avatar }];
      await updateDoc(doc(db, "users", currentUser.id), { blocked: newBlocked });
      setCurrentUser(prev => ({ ...prev, blocked: newBlocked }));
    } catch (e) {
      console.error("Error blocking user:", e);
    }
  };

  const unblockUser = async (targetUserId) => {
    if (!currentUser) return;
    try {
      const newBlocked = (currentUser.blocked || []).filter(u => u.id !== targetUserId);
      await updateDoc(doc(db, "users", currentUser.id), { blocked: newBlocked });
      setCurrentUser(prev => ({ ...prev, blocked: newBlocked }));
    } catch (e) {
      console.error("Error unblocking user:", e);
    }
  };

  const reportUser = async (targetUser, reason = 'Inappropriate content') => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: currentUser.id,
        reportedId: targetUser.id,
        reason: reason,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error reporting user:", e);
    }
  };

  const createQuickChat = async (targetUser) => {
    if (!currentUser) return null;

    if (currentUser.isGuest) {
      alert("Guests cannot use Quick Chat. Please upgrade to a Google account!");
      return null;
    }
    
    const chatId = [currentUser.id, targetUser.id].sort().join('_');
    const existingChat = chats.find(c => c.id === chatId);
    
    if (existingChat) {
       return chatId; // Just return existing ID to open it
    }

    try {
      const docRef = doc(db, "chats", chatId);
      await setDoc(docRef, {
        users: [currentUser.id, targetUser.id],
        userDetails: {
          [currentUser.id]: { name: currentUser.name, avatar: currentUser.avatar },
          [targetUser.id]: { name: targetUser.name, avatar: targetUser.avatar }
        },
        lastMessage: "Quick Chat started ⚡",
        updatedAt: serverTimestamp(),
        unreadCount: { [targetUser.id]: 1, [currentUser.id]: 0 }
      }, { merge: true });
      return chatId;
    } catch (e) {
      console.error("Error creating quick chat:", e);
      return null;
    }
  };

  const sendNotification = async (toUserId, type, message, fromUserId = null, fromUserObj = null) => {
    if (currentUser?.isGuest && type !== 'nearby') return; // Guests can't send waves/views
    try {
      await addDoc(collection(db, "notifications"), {
        userId: toUserId,
        type, // 'wave', 'view', 'nearby', 'system'
        message,
        fromUserId,
        fromUser: fromUserObj,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Error sending notification:", e);
    }
  };

  const markNotificationsRead = async () => {
    if (!currentUser) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error marking notifications read:", e);
    }
  };

  const upgradeAccount = async (credential) => {
    if (!auth.currentUser) return false;
    try {
      const result = await linkWithCredential(auth.currentUser, credential);
      const user = result.user;
      
      // Mark as no longer guest in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        isGuest: false,
        name: user.displayName || currentUser.name,
        avatar: user.photoURL || currentUser.avatar
      });
      
      setCurrentUser(prev => ({ ...prev, isGuest: false }));
      return true;
    } catch (e) {
      console.error("Upgrade Account Error:", e);
      return false;
    }
  };

  const checkUsernameUnique = async (username) => {
    if (!username) return false;
    try {
      const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
      const snap = await getDocs(q);
      return snap.empty;
    } catch (e) {
      console.error("Username check error:", e);
      return false;
    }
  };

  const deleteAccount = async () => {
    if (!currentUser) return;
    try {
      const user = auth.currentUser;
      if (!user) return;

      const batch = writeBatch(db);
      
      // 1. Delete user document
      batch.delete(doc(db, "users", currentUser.id));
      
      // 2. Delete related notifications
      const qNotifs = query(collection(db, "notifications"), where("userId", "==", currentUser.id));
      const notifSnap = await getDocs(qNotifs);
      notifSnap.forEach(d => batch.delete(doc(db, "notifications", d.id)));

      // 3. Delete sent requests
      const qSent = query(collection(db, "requests"), where("fromId", "==", currentUser.id));
      const sentSnap = await getDocs(qSent);
      sentSnap.forEach(d => batch.delete(doc(db, "requests", d.id)));

      // 4. Delete received requests
      const qRec = query(collection(db, "requests"), where("toId", "==", currentUser.id));
      const recSnap = await getDocs(qRec);
      recSnap.forEach(d => batch.delete(doc(db, "requests", d.id)));

      await batch.commit();

      // 5. Delete Auth User
      await deleteUser(user);
      
      setCurrentUser(null);
      return true;
    } catch (e) {
      console.error("Error deleting account:", e);
      if (e.code === 'auth/requires-recent-login') {
        alert("Please log out and log in again to delete your account for security reasons.");
      } else {
        alert("Failed to delete account. Please try again.");
      }
      return false;
    }
  };

  // Filter out blocked users and ghost mode users globally
  const visibleUsers = nearbyUsers.filter(u => {
    if (!currentUser) return false; // If not logged in, don't show users or wait for load
    
    const myBlockedIds = (currentUser?.blocked || []).map(b => b.id);
    if (myBlockedIds.includes(u.id)) return false; // I blocked them
    
    const theirBlockedIds = (u.blocked || []).map(b => b.id);
    if (theirBlockedIds.includes(currentUser.id)) return false; // They blocked me
    
    if (u.ghostMode === true) return false;
    return true;
  });

  const markAsViewed = (userId) => {
    setSessionViews(prev => new Set([...prev, userId]));
  };

  const markAsSkipped = (userId) => {
    const newSkipped = { ...skippedUsers, [userId]: Date.now() };
    setSkippedUsers(newSkipped);
    localStorage.setItem('skipped_users', JSON.stringify(newSkipped));
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      loadingAuth,
      nearbyUsers: visibleUsers, setNearbyUsers,
      requests,
      sentRequests,
      chats,
      notifications,
      sendNotification,
      markNotificationsRead,
      sendRequest,
      acceptRequest,
      rejectRequest,
      blockUser,
      unblockUser,
      reportUser,
      createQuickChat,
      sessionViews,
      markAsViewed,
      skippedUsers,
      markAsSkipped,
      deleteAccount,
      upgradeAccount,
      checkUsernameUnique
    }}>
      {!loadingAuth && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
