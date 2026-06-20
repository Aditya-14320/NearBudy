import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let serviceAccount = null;
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountKey) {
  try {
    const trimmed = serviceAccountKey.trim();
    if (trimmed.startsWith('{')) {
      serviceAccount = JSON.parse(trimmed);
    } else {
      // Decode base64
      serviceAccount = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
    }
    
    // Ensure that escaped newline sequences in the private key are replaced with actual newlines
    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", e);
  }
}

let app;
let adminAuth;
let adminDb;

try {
  if (getApps().length === 0) {
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Calling initializeApp() without credentials will fail outside Google Cloud,
      // so we explicitly throw a helpful message if serviceAccount is missing.
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined.");
    }
  } else {
    app = getApps()[0];
  }
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} catch (error) {
  console.error("Firebase Admin SDK initialization failed:", error.message);
  
  const createFailureProxy = (serviceName) => {
    return new Proxy({}, {
      get(target, prop) {
        if (prop === 'then') return undefined; // Avoid blocking promise resolutions
        throw new Error(
          `Firebase ${serviceName} failed to initialize. Please check that FIREBASE_SERVICE_ACCOUNT_KEY is configured in your Netlify Environment Variables. (Original error: ${error.message})`
        );
      }
    });
  };

  adminAuth = createFailureProxy("Auth");
  adminDb = createFailureProxy("Firestore");
  app = null;
}

export { adminAuth, adminDb };
export default app;


