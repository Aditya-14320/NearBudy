import { adminAuth, adminDb } from '../_utils/firebase-admin.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, phone, otp, newPassword } = req.body;

  if ((!email && !phone) || !otp || !newPassword) {
    return res.status(400).json({ error: 'Missing parameters. Requires email/phone, otp, and newPassword.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const db = adminDb;
    const isPhone = !!phone;
    const identifier = isPhone ? phone.trim() : email.toLowerCase().trim();
    const mappedEmail = isPhone ? `${identifier}@phone.nearbudy.local` : identifier;

    const docId = `${identifier}_forgot_password`;
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

    // Increment attempts
    await otpRef.update({
      attempts: otpData.attempts + 1
    });

    // Verify OTP code
    if (otpData.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
    }

    // Success! Update password in Firebase Auth using Admin SDK
    const auth = adminAuth;
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(mappedEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'No account found with this identifier.' });
      }
      throw err;
    }

    // Update user password and ensure verification is true
    await auth.updateUser(userRecord.uid, {
      password: newPassword,
      emailVerified: true
    });

    // Delete OTP document from Firestore
    await otpRef.delete();

    return res.status(200).json({ success: true, message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error("Error in reset-password handler:", error);
    return res.status(500).json({ error: error.message || 'Failed to reset password. Please try again.' });
  }
}
