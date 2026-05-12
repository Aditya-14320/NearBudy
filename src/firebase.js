import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAg0v4rVwQ9-PNu7cVl8NGubelIvQG1FLA",
  authDomain: "amdd-76ff2.firebaseapp.com",
  projectId: "amdd-76ff2",
  storageBucket: "amdd-76ff2.firebasestorage.app",
  messagingSenderId: "428992181441",
  appId: "1:428992181441:web:be5c19484100a343edd040",
  measurementId: "G-VTDT307MCY"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export { setPersistence, browserLocalPersistence };
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);
