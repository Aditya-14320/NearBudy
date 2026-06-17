import { adminDb } from './firebase-admin.js';

const COOLDOWN_SECONDS = 30;
const EMAIL_HOUR_LIMIT = 5;
const IP_HOUR_LIMIT = 20;

/**
 * Check if the OTP request exceeds rate limits.
 * Throws an Error if a limit is exceeded, otherwise updates/saves the limits.
 * @param {string} email
 * @param {string} ip
 */
export const checkRateLimit = async (email, ip) => {
  if (!email) throw new Error("Email is required for rate limit checking.");
  
  const nowMs = Date.now();
  const db = adminDb;
  
  // Clean email to use as document ID safely
  const cleanEmail = email.toLowerCase().trim();
  const emailLimitRef = db.collection('rate_limits').doc(cleanEmail);
  
  // 1. Email limit check
  const emailLimitDoc = await emailLimitRef.get();
  let emailLimitData = emailLimitDoc.exists ? emailLimitDoc.data() : null;
  
  if (emailLimitData) {
    const lastSent = emailLimitData.lastOtpSentAt || 0;
    const diffSeconds = Math.floor((nowMs - lastSent) / 1000);
    
    // Check 60s Cooldown
    if (diffSeconds < COOLDOWN_SECONDS) {
      throw new Error(`Please wait ${COOLDOWN_SECONDS - diffSeconds} more seconds before requesting another verification code.`);
    }
    
    // Check Hourly Window
    const windowStart = emailLimitData.windowStart || 0;
    const diffHours = (nowMs - windowStart) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      if (emailLimitData.otpCountInWindow >= EMAIL_HOUR_LIMIT) {
        throw new Error(`You have requested too many verification codes. Please try again in an hour.`);
      }
      // Increment count
      emailLimitData.otpCountInWindow += 1;
      emailLimitData.lastOtpSentAt = nowMs;
    } else {
      // Reset window
      emailLimitData.windowStart = nowMs;
      emailLimitData.otpCountInWindow = 1;
      emailLimitData.lastOtpSentAt = nowMs;
    }
  } else {
    emailLimitData = {
      windowStart: nowMs,
      otpCountInWindow: 1,
      lastOtpSentAt: nowMs
    };
  }
  
  // 2. IP limit check
  let ipLimitRef = null;
  let ipLimitData = null;
  
  if (ip) {
    // Generate a simple IP key (using base64 to avoid characters not allowed in doc ids)
    const ipKey = `ip_${Buffer.from(ip).toString('base64').replace(/=/g, '')}`;
    ipLimitRef = db.collection('rate_limits').doc(ipKey);
    const ipLimitDoc = await ipLimitRef.get();
    ipLimitData = ipLimitDoc.exists ? ipLimitDoc.data() : null;
    
    if (ipLimitData) {
      const windowStart = ipLimitData.windowStart || 0;
      const diffHours = (nowMs - windowStart) / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        if (ipLimitData.otpCountInWindow >= IP_HOUR_LIMIT) {
          throw new Error(`Too many requests from this device. Please try again in an hour.`);
        }
        ipLimitData.otpCountInWindow += 1;
      } else {
        ipLimitData.windowStart = nowMs;
        ipLimitData.otpCountInWindow = 1;
      }
    } else {
      ipLimitData = {
        windowStart: nowMs,
        otpCountInWindow: 1
      };
    }
  }
  
  // Persist checks atomically
  const batch = db.batch();
  batch.set(emailLimitRef, emailLimitData, { merge: true });
  if (ipLimitRef && ipLimitData) {
    batch.set(ipLimitRef, ipLimitData, { merge: true });
  }
  await batch.commit();
};
