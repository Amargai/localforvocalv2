import { DEFAULT_COORDINATES } from './constants';

const LOCATION_STORAGE_KEY = 'l4v_user_location';

/**
 * Get user's saved location from localStorage, or null
 */
export function getUserSavedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY) || localStorage.getItem('user_location');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Number.isFinite(Number(parsed?.lat)) && Number.isFinite(Number(parsed?.lng))) {
        return {
          lat: Number(parsed.lat),
          lng: Number(parsed.lng),
          area: parsed.area || 'Current Location',
          city: parsed.city || 'Nearby',
          isCustom: true
        };
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save user location to localStorage and broadcast event
 */
export function setUserSavedLocation(location) {
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return;
  }
  const cleanLoc = {
    lat: Number(location.lat),
    lng: Number(location.lng),
    area: location.area || 'Current Location',
    city: location.city || 'Near You',
    pin: location.pin || ''
  };
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(cleanLoc));
    localStorage.setItem('user_location', JSON.stringify(cleanLoc));
    window.dispatchEvent(new CustomEvent('l4v_location_changed', { detail: cleanLoc }));
  } catch (e) {
    // Ignore storage errors
  }
  return cleanLoc;
}

/**
 * Reverse geocode coordinates to get Area, City, and PIN using OpenStreetMap
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.municipality || addr.district || addr.county || addr.state_district || addr.state || '';
    const area = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.hamlet || addr.road || '';
    const pin = addr.postcode || '';
    return {
      area: area || city || 'Local Area',
      city: city || 'Your City',
      pin,
      displayName: data.display_name
    };
  } catch (err) {
    return null;
  }
}

/**
 * Promisified browser geolocation helper
 */
export function getCurrentBrowserPosition(options = { enableHighAccuracy: true, timeout: 8000 }) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        reject(err);
      },
      options
    );
  });
}
