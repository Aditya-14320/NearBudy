import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3RMOf0gjNPZ1PPhK2Sj9IT6OZ3SsSgzE",
  authDomain: "camchat-ee539.firebaseapp.com",
  projectId: "camchat-ee539",
  storageBucket: "camchat-ee539.firebasestorage.app",
  messagingSenderId: "52527857412",
  appId: "1:52527857412:web:ea44b9e160138984d95a51",
  measurementId: "G-EDN85V1WM8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);
