/**
 * Cloudinary Utility for NearBudy
 * Handles image uploads and dynamic URL transformations for optimization.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'nearbudy';

/**
 * Uploads an image to Cloudinary using unsigned upload presets.
 * Supports File objects and Base64 strings.
 */
export const uploadToCloudinary = async (fileOrBase64) => {
  if (!CLOUD_NAME) {
    console.error('Cloudinary Cloud Name is missing!');
    throw new Error('Cloudinary configuration error');
  }

  const formData = new FormData();
  formData.append('file', fileOrBase64);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'profiles'); // Organize in a folder

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Cloudinary upload failed');
    }

    const data = await response.json();
    return data.secure_url; // This returns the full-quality URL
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

/**
 * Transforms a standard Cloudinary URL into an optimized thumbnail.
 * @param {string} url - The full Cloudinary image URL
 * @param {number} size - Square dimension (default 200px)
 */
export const getThumbnailUrl = (url, size = 200) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  // Format: .../upload/v1234567/public_id.jpg
  // Insert: .../upload/c_fill,g_face,w_200,h_200,q_auto,f_auto/v1234567/public_id.jpg
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`);
};

/**
 * Optimized URL for high-quality profile display.
 */
export const getOptimizedProfileUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_800,q_auto,f_auto/');
};

/**
 * Low-quality placeholder for lazy loading.
 */
export const getPlaceholderUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_50,q_20,e_blur:500,f_auto/');
};
