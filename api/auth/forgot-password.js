import { adminAuth, adminDb } from '../_utils/firebase-admin.js';
import { sendEmail, getEmailTemplate } from '../_utils/ses-client.js';
import { sendSMS } from '../_utils/sns-client.js';
import { checkRateLimit } from '../_utils/rate-limit.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Missing parameter. Requires email or phone.' });
  }

  try {
    const isPhone = !!phone;
    const identifier = isPhone ? phone.trim() : email.toLowerCase().trim();
    const mappedEmail = isPhone ? `${identifier}@phone.nearbudy.local` : identifier;

    // 1. Verify user exists in Firebase Auth
    const auth = adminAuth;
    try {
      await auth.getUserByEmail(mappedEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          error: isPhone ? 'No account found with this phone number.' : 'No account found with this email address.' 
        });
      }
      throw err;
    }

    // 2. Rate limit check
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await checkRateLimit(identifier, ip);

    // 3. Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const nowMs = Date.now();
    const expiresAt = nowMs + 5 * 60 * 1000; // 5 minutes expiry

    // 4. Save in firestore
    const db = adminDb;
    const otpRef = db.collection('otps').doc(`${identifier}_forgot_password`);
    await otpRef.set({
      identifier: identifier,
      otp: otp,
      createdAt: nowMs,
      expiresAt: expiresAt,
      attempts: 0,
      type: 'forgot_password',
      isPhone: isPhone
    });

    // 5. Send Reset Code via SES (Email) or SNS (SMS)
    if (isPhone) {
      const smsMessage = `Your NearBudy password reset code is: ${otp}. This code will expire in 5 minutes.`;
      await sendSMS(identifier, smsMessage);
    } else {
      const subject = 'Reset Your NearBudy Password';
      const htmlContent = getEmailTemplate(otp, subject);
      const textContent = `Hello,\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.\n\nNearBudy Team\nhttps://nearbudy.xyz`;

      await sendEmail(identifier, subject, htmlContent, textContent);
    }

    return res.status(200).json({ success: true, message: 'Password reset code sent successfully.' });
  } catch (error) {
    console.error("Error in forgot-password handler:", error);
    const isRateLimitError = error.message.includes('wait') || error.message.includes('too many') || error.message.includes('Too many');
    return res.status(isRateLimitError ? 429 : 500)
      .json({ error: error.message || 'Failed to request password reset. Please try again.' });
  }
}
