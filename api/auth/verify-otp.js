import { adminAuth, adminDb } from '../_utils/firebase-admin.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Missing parameters. Requires email and otp.' });
  }

  try {
    const db = adminDb;
    const cleanEmail = email.toLowerCase().trim();
    const docId = `${cleanEmail}_signup`;
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
      return res.status(400).json({ error: 'Too many incorrect attempts. This code has been invalidated. Please request a new one.' });
    }

    // Increment attempts
    await otpRef.update({
      attempts: otpData.attempts + 1
    });

    // Verify OTP code
    if (otpData.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
    }

    // Success! Update user status in Firebase Auth using Admin SDK
    const auth = adminAuth;
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(cleanEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'No account found with this email.' });
      }
      throw err;
    }

    // Mark email as verified
    await auth.updateUser(userRecord.uid, {
      emailVerified: true
    });

    // Delete OTP document from Firestore
    await otpRef.delete();

    return res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    console.error("Error in verify-otp handler:", error);
    return res.status(500).json({ error: error.message || 'Failed to verify OTP. Please try again.' });
  }
}
