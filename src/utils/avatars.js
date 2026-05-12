export const AVATAR_PRESETS = {
  male: [
    '/avatars/male_1.png',
    '/avatars/male_2.png',
    '/avatars/male_3.png'
  ],
  female: [
    '/avatars/female_1.png',
    '/avatars/female_2.png'
  ],
  neutral: [
    '/avatars/neutral.png'
  ]
};

export const getDefaultAvatar = (gender) => {
  if (gender === 'Male') return AVATAR_PRESETS.male[0];
  if (gender === 'Female') return AVATAR_PRESETS.female[0];
  return AVATAR_PRESETS.neutral[0];
};
