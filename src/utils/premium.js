/**
 * Shared premium utilities for NearBudy
 */

/** Returns true if user has an active premium subscription. */
export const isUserPremium = (user) => {
  if (!user) return false;
  if (!user.isPremium) return false;
  if (!user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
};

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
