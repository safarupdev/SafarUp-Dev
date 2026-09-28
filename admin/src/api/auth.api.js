/**
 * Auth API calls — thin wrappers around the backend routes defined in
 * backend/src/routes/auth.routes.js. PRD §30.
 */

import { apiClient, unwrap } from '../lib/apiClient';

export async function adminLogin({ email, password }) {
  const response = await apiClient.post('/auth/admin/login', { email, password });
  return unwrap(response); // { user }
}

export async function fetchCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return unwrap(response); // { user }
}

export async function logout() {
  const response = await apiClient.post('/auth/logout');
  return unwrap(response);
}

export async function forgotPassword({ email }) {
  // Uses the admin-specific endpoint so the emailed reset link points to
  // admin.safarup.in instead of the public app — see backend
  // auth.controller.js `adminForgotPassword`.
  const response = await apiClient.post('/auth/admin/forgot-password', { email });
  return unwrap(response);
}

export async function resetPassword({ token, password, confirmPassword }) {
  const response = await apiClient.post('/auth/reset-password', {
    token,
    password,
    confirmPassword,
  });
  return unwrap(response);
}
