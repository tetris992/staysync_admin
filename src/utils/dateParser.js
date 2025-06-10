import { parse, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ko, enUS } from 'date-fns/locale';

// import HotelSettingsModel from '../models/HotelSettings.js'; // 제거

// Constants
const DEFAULT_TIMEZONE = process.env.TIMEZONE || 'Asia/Seoul';
const DEFAULT_CHECK_IN_TIME = '16:00';
const DEFAULT_CHECK_OUT_TIME = '11:00';
const MAX_CACHE_SIZE = 1000; // Limit cache size to prevent memory issues
const SENSITIVE_LOGGING = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

// Cache for parsed dates
const parsedDateCache = new Map();

/**
 * Cleans a date string by removing unnecessary characters and normalizing whitespace.
 * @param {string} str - The input date string.
 * @returns {string} - The cleaned date string.
 */
const cleanString = (str) => {
  return str
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/[-]+$/g, '') // Remove trailing dashes
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\n/g, ' ') // Replace newlines
    .replace(/미리예약/g, '') // Remove Korean "pre-reservation" text
    .trim();
};

/**
 * Fetches hotel default time via API (to be implemented in backend).
 * @param {string} hotelId - The hotel ID.
 * @param {'checkIn' | 'checkOut'} type - The type of time to retrieve.
 * @returns {Promise<string>} - The time in HH:mm format.
 */
const getHotelDefaultTime = async (hotelId, type) => {
  const defaultTimes = { checkIn: DEFAULT_CHECK_IN_TIME, checkOut: DEFAULT_CHECK_OUT_TIME };
  if (!hotelId) return defaultTimes[type];

  try {
    // Replace with actual API call
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/hotel/settings`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const settings = await response.json();
    const time = settings?.[type === 'checkIn' ? 'checkInTime' : 'checkOutTime'] || defaultTimes[type];
    if (!time) throw new Error(`No ${type} time found in settings`);
    return time;
  } catch (error) {
    if (SENSITIVE_LOGGING) {
      console.error(`[dateParser.js] Failed to fetch ${type} time for hotelId ${hotelId}:`, error.message);
    }
    return defaultTimes[type];
  }
};

/**
 * Parses a date string and returns an ISO 8601 string in the specified timezone.
 * @param {string} dateString - The date string to parse.
 * @param {string|null} [hotelId=null] - The hotel ID for default times.
 * @param {boolean} [isCheckIn=true] - Whether to use check-in (true) or check-out (false) time.
 * @param {string} [timezone=DEFAULT_TIMEZONE] - The target timezone.
 * @returns {Promise<string|null>} - ISO 8601 string or null if invalid.
 */
export const parseDate = async (
  dateString,
  hotelId = null,
  isCheckIn = true,
  timezone = DEFAULT_TIMEZONE
) => {
  if (!dateString || typeof dateString !== 'string') {
    if (SENSITIVE_LOGGING) {
      console.warn('[dateParser.js] Invalid dateString:', dateString);
    }
    return null;
  }

  const cacheKey = `${dateString}|${hotelId}|${isCheckIn}|${timezone}`;
  if (parsedDateCache.has(cacheKey)) {
    return parsedDateCache.get(cacheKey);
  }

  const cleaned = cleanString(dateString);

  if (!/\d{4}/.test(cleaned)) {
    if (SENSITIVE_LOGGING) {
      console.warn('[dateParser.js] Invalid date string (no year):', cleaned);
    }
    parsedDateCache.set(cacheKey, null);
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const dt = parse(cleaned, 'yyyy-MM-dd', new Date());
    if (isValid(dt)) {
      const [hh, mm] = (await getHotelDefaultTime(hotelId, isCheckIn ? 'checkIn' : 'checkOut')).split(':');
      dt.setHours(Number(hh), Number(mm), 0, 0);
      const zoned = formatInTimeZone(dt, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
      parsedDateCache.set(cacheKey, zoned);
      manageCacheSize();
      return zoned;
    }
  }

  const dateFormats = [
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm",
    'yyyy년 M월 d일 HH:mm',
    'yyyy년 MM월 dd일 HH:mm',
    'yyyy년 M월 d일',
    'yyyy년 MM월 dd일',
    'yyyy.MM.dd HH:mm',
    'yyyy.MM.dd',
    'yyyy.MM.dd HH:mm:ss',
    'dd MMM yyyy HH:mm',
    'dd MMM yyyy',
    'MMM dd, yyyy HH:mm',
    'MMM dd, yyyy',
    'MMM dd yyyy',
    'MMMM dd, yyyy',
    'd MMM yyyy',
    'd MMM yyyy HH:mm',
    'd MMM yyyy HH:mm:ss',
    'MMM d, yyyy',
    'MMM d, yyyy HH:mm',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd',
    'yyyy/MM/dd HH:mm',
    'yyyy/MM/dd HH:mm:ss',
    'yyyy/MM/dd',
    'dd-MM-yyyy HH:mm',
    'dd-MM-yyyy',
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy',
  ];

  for (const locale of [ko, enUS]) {
    for (const fmt of dateFormats) {
      const dt = parse(cleaned, fmt, new Date(), { locale });
      if (isValid(dt)) {
        if (!/HH|mm/.test(fmt)) {
          const [hh, mm] = (await getHotelDefaultTime(hotelId, isCheckIn ? 'checkIn' : 'checkOut')).split(':');
          dt.setHours(Number(hh), Number(mm), 0, 0);
        }
        const zoned = formatInTimeZone(dt, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
        parsedDateCache.set(cacheKey, zoned);
        manageCacheSize();
        return zoned;
      }
    }
  }

  try {
    const dt = new Date(cleaned);
    if (isValid(dt)) {
      if (!/\d{1,2}:\d{2}(:\d{2})?/.test(cleaned)) {
        const [hh, mm] = (await getHotelDefaultTime(hotelId, isCheckIn ? 'checkIn' : 'checkOut')).split(':');
        dt.setHours(Number(hh), Number(mm), 0, 0);
      }
      const zoned = formatInTimeZone(dt, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
      parsedDateCache.set(cacheKey, zoned);
      manageCacheSize();
      return zoned;
    }
  } catch (error) {
    if (SENSITIVE_LOGGING) {
      console.warn('[dateParser.js] JS Date parsing failed for:', cleaned, 'Error:', error.message);
    }
  }

  parsedDateCache.set(cacheKey, null);
  manageCacheSize();
  return null;
};

const manageCacheSize = () => {
  if (parsedDateCache.size > MAX_CACHE_SIZE) {
    const keys = parsedDateCache.keys();
    for (let i = 0; i < Math.floor(MAX_CACHE_SIZE / 2); i++) {
      parsedDateCache.delete(keys.next().value);
    }
  }
};