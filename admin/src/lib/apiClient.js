/**
 * Axios instance for all admin API calls.
 *
 * `withCredentials: true` is required because auth is cookie-based
 * (httpOnly access/refresh cookies — PRD §30), not a bearer token stored
 * in JS. On a 401 from an expired access token, we transparently call
 * /auth/refresh once and retry the original request — this avoids forcing
 * a full re-login every 15 minutes (the access token TTL) for an admin
 * mid-task.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isAuthRoute =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/admin/login') ||
      config?.url?.includes('/auth/refresh');

    if (response?.status !== 401 || isAuthRoute || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;

    try {
      // Coalesce concurrent 401s into a single refresh call.
      refreshPromise = refreshPromise || apiClient.post('/auth/refresh');
      await refreshPromise;
      return apiClient(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  }
);

/**
 * Unwraps the backend's standard { success, message, data } envelope
 * (see backend/src/utils/ApiResponse.js) into just `data`, and normalizes
 * errors into a consistent shape for UI consumption.
 */
export function unwrap(response) {
  return response.data?.data;
}

/**
 * Extracts a user-facing message from an Axios error produced by the
 * backend's central error handler (backend/src/middleware/errorHandler.js).
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback;
}

/**
 * Extracts field-level validation errors (backend ApiError.details shape)
 * for mapping onto react-hook-form field errors.
 */
export function getErrorDetails(error) {
  return error?.response?.data?.details || [];
}
