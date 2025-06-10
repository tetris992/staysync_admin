import axios from 'axios';

import ApiError from '../utils/ApiError';

// Constants
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const SENSITIVE_LOGGING = process.env.NODE_ENV !== 'production';

// Validate BASE_URL in non-production
if (!process.env.REACT_APP_API_BASE_URL && SENSITIVE_LOGGING) {
  console.warn(
    '[api.js] REACT_APP_API_BASE_URL is not set. Using default:',
    BASE_URL
  );
}

if (SENSITIVE_LOGGING) {
  console.log('[api.js] BASE_URL:', BASE_URL);
}

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
});

// Cache for CSRF token fetch to prevent race conditions
let csrfTokenPromise = null;

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    // Ensure skipCsrf is a boolean
    config.skipCsrf = !!config.skipCsrf;

    if (config.skipCsrf) {
      if (SENSITIVE_LOGGING) {
        console.log('[api.js] Skipping CSRF fetch for request:', config.url);
      }
      return config;
    }

    // Add Authorization header if access token exists
    const token = localStorage.getItem('accessToken');
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Access token:', token ? 'present' : 'missing');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle CSRF for non-GET requests (except CSRF endpoint)
    if (
      config.method.toLowerCase() !== 'get' &&
      !config.url.includes('/api/csrf-token')
    ) {
      let csrfToken = localStorage.getItem('csrfToken');
      let csrfTokenId = localStorage.getItem('csrfTokenId');

      if (!csrfToken || !csrfTokenId) {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Fetching new CSRF token');
        }

        // Reuse existing CSRF token fetch if in progress
        if (!csrfTokenPromise) {
          csrfTokenPromise = api.get('/api/csrf-token', {
            skipCsrf: true,
            timeout: DEFAULT_TIMEOUT,
          });
        }

        try {
          const { data } = await csrfTokenPromise;
          csrfToken = data.csrfToken;
          csrfTokenId = data.tokenId;
          localStorage.setItem('csrfToken', csrfToken);
          localStorage.setItem('csrfTokenId', csrfTokenId);
          if (SENSITIVE_LOGGING) {
            console.log('[api.js] CSRF token fetched:', {
              csrfToken,
              csrfTokenId,
            });
          }
        } finally {
          csrfTokenPromise = null; // Clear cache
        }
      }

      config.headers['X-CSRF-Token'] = csrfToken;
      config.headers['X-CSRF-Token-Id'] = csrfTokenId;
    }

    if (SENSITIVE_LOGGING) {
      console.log(
        '[api.js] Request:',
        config.method.toUpperCase(),
        config.url,
        config.data
      );
    }
    return config;
  },
  (error) => {
    console.error('[api.js] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 403 (CSRF token issues)
    if (error.response?.status === 403 && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true;
      try {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Retrying with new CSRF token');
        }
        const { data } = await api.get('/api/csrf-token', {
          skipCsrf: true,
          timeout: DEFAULT_TIMEOUT,
        });
        localStorage.setItem('csrfToken', data.csrfToken);
        localStorage.setItem('csrfTokenId', data.tokenId);
        originalRequest.headers['X-CSRF-Token'] = data.csrfToken;
        originalRequest.headers['X-CSRF-Token-Id'] = data.tokenId;
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] CSRF token updated, retrying request');
        }
        return api(originalRequest);
      } catch (csrfError) {
        console.error('[api.js] CSRF token refresh failed:', csrfError);
        throw new ApiError(403, 'CSRF token refresh failed');
      }
    }

    // Handle 401 (access token issues)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Refreshing access token');
        }
        const { data } = await api.post(
          '/api/auth/refresh-token',
          {},
          { timeout: DEFAULT_TIMEOUT }
        );
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Access token refreshed, retrying request');
        }
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[api.js] Access token refresh failed:', refreshError);
        // Clear only auth-related localStorage keys
        localStorage.removeItem('accessToken');
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('csrfTokenId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    console.error('[api.js] Response error:', error);
    return Promise.reject(error);
  }
);

// API Functions
export const fetchUsers = async (status) => {
  try {
    // Validate status
    const validStatuses = ['all', 'active', 'inactive', 'pending']; // Adjust as needed
    if (status && !validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status parameter');
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Fetching users with status:', status);
    }
    const response = await api.get('/api/admin/users', {
      params: { status: status === 'all' ? undefined : status },
      timeout: DEFAULT_TIMEOUT,
    });

    if (!response.data?.data) {
      throw new ApiError(500, 'Server did not return user data');
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Users response:', response.data);
    }
    return response.data.data;
  } catch (error) {
    console.error('[api.js] Fetch users error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to fetch users'
    );
  }
};

export const updateUserStatus = async (hotelId, status) => {
  try {
    // Validate inputs
    if (!hotelId || typeof hotelId !== 'string') {
      throw new ApiError(400, 'Invalid hotelId');
    }
    const validStatuses = ['active', 'inactive', 'pending']; // Adjust as needed
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    if (SENSITIVE_LOGGING) {
      console.log(
        '[api.js] Updating status for hotelId:',
        hotelId,
        'to:',
        status
      );
    }
    const response = await api.patch(`/api/admin/users/${hotelId}/status`, {
      status,
    });

    if (!response.data?.data) {
      throw new ApiError(500, 'Server did not return status update data');
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Update status response:', response.data);
    }
    return response.data.data;
  } catch (error) {
    console.error('[api.js] Update status error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to update status'
    );
  }
};

export const fetchHotelSales = async (hotelId, type, startDate, endDate) => {
  try {
    // Validate inputs
    if (!hotelId || typeof hotelId !== 'string') {
      throw new ApiError(400, 'Invalid hotelId');
    }
    const validTypes = ['daily', 'weekly', 'monthly']; // Adjust as needed
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid type');
    }
    if (
      !startDate ||
      !endDate ||
      isNaN(Date.parse(startDate)) ||
      isNaN(Date.parse(endDate))
    ) {
      throw new ApiError(400, 'Invalid date range');
    }

    if (SENSITIVE_LOGGING) {
      console.log(
        '[api.js] Fetching sales for hotelId:',
        hotelId,
        'type:',
        type
      );
    }
    const response = await api.get(`/api/sales/${hotelId}/sales`, {
      params: { type, startDate, endDate },
      timeout: DEFAULT_TIMEOUT,
    });

    if (!response.data) {
      throw new ApiError(500, 'Server did not return sales data');
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Sales response:', response.data);
    }
    return response.data;
  } catch (error) {
    console.error('[api.js] Fetch sales error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to fetch sales data'
    );
  }
};

export default api;
