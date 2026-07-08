/**
 * Shared utilities for NearBudy
 *
 * NOTE: Premium features are intentionally disabled for v1.0.
 * All users currently receive the full experience for free.
 * To re-enable Premium in a future version, restore the real
 * implementation of `isUserPremium` and remove the stub below.
 */

/**
 * Returns true if user has an active premium subscription.
 * STUB: Always returns false — Premium is disabled in v1.0.
 * Future: restore real check using isPremium + premiumExpiresAt fields.
 */
// eslint-disable-next-line no-unused-vars
export const isUserPremium = (_user) => false;

/** Returns a normalized interests array from either a CSV string or an array. */
export const getInterestsArray = (interests) => {
  if (!interests) return [];
  if (Array.isArray(interests)) return interests;
  if (typeof interests === 'string') return interests.split(',').map(i => i.trim()).filter(Boolean);
  return [];
};

/** Online status check — user active within last 5 minutes. */
export const isUserOnline = (user) => {
  if (!user) return false;
  const activeTime = user.lastActive?.toMillis ? user.lastActive.toMillis() :
    user.lastActive ? new Date(user.lastActive).getTime() : 0;
  return Date.now() - activeTime < 5 * 60 * 1000;
};
