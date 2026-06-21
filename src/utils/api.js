import { Capacitor } from '@capacitor/core';

// Base URL: absolute URL for Native Android/iOS, relative for Web (proxied during local development)
const API_BASE_URL = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_URL || 'https://nearbudy-8e4cb.vercel.app/api')
  : '/api';

/**
 * Helper to make network requests to the backend API.
 * Handles platform URLs and error parsing.
 * @param {string} endpoint - e.g. '/auth/send-otp'
 * @param {object} options - Fetch options
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Return empty object if response is not JSON
  }
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  
  return data;
};
