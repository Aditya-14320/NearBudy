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

  const { email, phone, type } = req.body;

  if ((!email && !phone) || !type || !['signup', 'forgot_password'].includes(type)) {
    return res.status(400).json({ error: 'Missing or invalid parameters. Requires email or phone, and type.' });
  }

  try {
    const db = adminDb;
    const auth = adminAuth;
    const isPhone = !!phone;
    const identifier = isPhone ? phone.trim() : email.toLowerCase().trim();
    const mappedEmail = isPhone ? `${identifier}@phone.nearbudy.local` : identifier;

    // 1. Uniqueness / Existence Check
    console.log(`[send-otp] Checking status for identifier: ${identifier}, mappedEmail: ${mappedEmail}, type: ${type}`);
    try {
      const userRecord = await auth.getUserByEmail(mappedEmail);
      console.log(`[send-otp] Found user record. emailVerified: ${userRecord?.emailVerified}`);
      if (type === 'signup') {
        if (userRecord.emailVerified) {
          console.log(`[send-otp] Blocking signup because user is already verified.`);
          return res.status(400).json({ 
            error: isPhone ? 'An account with this phone number already exists.' : 'An account with this email already exists.' 
          });
        } else {
          console.log(`[send-otp] User exists but is not verified. Allowing signup OTP send.`);
        }
      }
    } catch (err) {
      console.log(`[send-otp] getUserByEmail threw error: ${err.code || err.message}`);
      if (err.code === 'auth/user-not-found') {
        if (type === 'forgot_password') {
          return res.status(404).json({ 
            error: isPhone ? 'No account exists with this phone number.' : 'No account exists with this email address.' 
          });
        }
      } else {
        throw err;
      }
    }

    // 2. Rate limit check (using the email or phone number as rate limit key)
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await checkRateLimit(identifier, ip);

    // 3. Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const nowMs = Date.now();
    const expiresAt = nowMs + 5 * 60 * 1000; // 5 minutes expiry

    // 4. Save the OTP in firestore under `/otps/${identifier}_${type}`
    const otpRef = db.collection('otps').doc(`${identifier}_${type}`);
    await otpRef.set({
      identifier: identifier,
      otp: otp,
      createdAt: nowMs,
      expiresAt: expiresAt,
      attempts: 0,
      type: type,
      isPhone: isPhone
    });

    // 5. Send OTP via SES (Email) or SNS (SMS)
    if (isPhone) {
      const smsMessage = `Your NearBudy verification code is: ${otp}. This code will expire in 5 minutes.`;
      await sendSMS(identifier, smsMessage);
    } else {
      let subject;
      if (type === 'signup') {
        subject = 'Verify Your NearBudy Account';
      } else {
        subject = 'Reset Your NearBudy Password';
      }

      const htmlContent = getEmailTemplate(otp, subject);
      const textContent = `Hello,\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.\n\nNearBudy Team\nhttps://nearbudy.xyz`;

      await sendEmail(identifier, subject, htmlContent, textContent);
    }

    return res.status(200).json({ success: true, message: 'Verification code sent successfully.' });
  } catch (error) {
    console.error("Error in send-otp handler:", error);
    const isRateLimitError = error.message.includes('wait') || error.message.includes('too many') || error.message.includes('Too many');
    return res.status(isRateLimitError ? 429 : 500)
      .json({ error: error.message || 'Failed to send verification code. Please try again.' });
  }
}
