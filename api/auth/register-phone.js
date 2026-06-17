import { adminAuth, adminDb } from '../_utils/firebase-admin.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { phone, otp, password } = req.body;

  if (!phone || !otp || !password) {
    return res.status(400).json({ error: 'Missing parameters. Requires phone, otp, and password.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const db = adminDb;
    const auth = adminAuth;
    const cleanPhone = phone.trim();
    const docId = `${cleanPhone}_signup`;
    const otpRef = db.collection('otps').doc(docId);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'Verification code not found or already verified.' });
    }

    const otpData = otpDoc.data();
    const nowMs = Date.now();

    // Check expiration
    if (nowMs > otpData.expiresAt) {
      await otpRef.delete();
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check attempts (Brute force protection)
    if (otpData.attempts >= 5) {
      await otpRef.delete();
      return res.status(400).json({ error: 'Too many incorrect attempts. Code invalidated. Please request a new one.' });
    }

    // Verify OTP code
    if (otpData.otp !== otp.trim()) {
      // Increment attempts
      await otpRef.update({
        attempts: otpData.attempts + 1
      });
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
    }

    // Success! Verify uniqueness one last time
    const phoneEmail = `${cleanPhone}@phone.nearbudy.local`;
    try {
      await auth.getUserByEmail(phoneEmail);
      return res.status(400).json({ error: 'An account with this phone number already exists.' });
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Create user in Firebase Auth using Admin SDK
    const userRecord = await auth.createUser({
      email: phoneEmail,
      password: password,
      emailVerified: true
    });

    // Create user profile document in Firestore
    const referralCode = `NB${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const guestId = Math.floor(1000 + Math.random() * 9000);
    const userDocRef = db.collection('users').doc(userRecord.uid);

    await userDocRef.set({
      id: userRecord.uid,
      name: `User_${guestId}`,
      username: `user_${guestId}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=user_${guestId}`,
      phone: cleanPhone,
      isPremium: false,
      referralCode: referralCode,
      lat: 28.6304,
      lng: 77.2177,
      createdAt: nowMs
    });

    // Delete OTP document from Firestore
    await otpRef.delete();

    return res.status(200).json({ success: true, message: 'Account created successfully! Redirecting to login...' });
  } catch (error) {
    console.error("Error in register-phone handler:", error);
    return res.status(500).json({ error: error.message || 'Failed to complete registration. Please try again.' });
  }
}
