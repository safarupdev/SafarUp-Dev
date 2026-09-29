/**
 * Axios instance for all public API calls.
 *
 * Deliberately simpler than `admin/src/lib/apiClient.js`: the public surface is
 * anonymous, so there is no httpOnly session cookie to send and no 401 refresh
 * dance to run (admin/src/lib/apiClient.js owns that concern). What is shared
 * with admin is the *envelope*: the backend answers
 * `{ success, message, data }` (backend/src/utils/ApiResponse.js) and this
 * module is the single place that unwraps it.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

/** Unwraps the backend `{ success, message, data }` envelope down to `data`. */
export function unwrap(response) {
  return response.data?.data;
}

/**
 * Extracts a user-facing message from an Axios error raised by the backend's
 * central error handler (backend/src/middleware/errorHandler.js).
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback;
}

/** HTTP status carried by an Axios error, or `null` for a network failure. */
export function getStatus(error) {
  return error?.response?.status ?? null;
}

/**
 * A DRAFT, ARCHIVED or simply unknown slug both answer 404
 * (API.destination.contract.md §2.2 — the existence of unpublished content is
 * never disclosed). A public page must render a "not found" state, not crash
 * and not show a generic error.
 */
export function isNotFound(error) {
  return getStatus(error) === 404;
}

/** True for a connection failure / timeout — no response at all. */
export function isNetworkError(error) {
  return Boolean(error?.request) && !error?.response;
}
