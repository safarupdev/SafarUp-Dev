/**
 * Auth HTTP controllers — thin layer over services/auth.service.js.
 * PRD §30 (Authentication), §137 (Customer Communication: every critical
 * state change must be visible through dashboard + email).
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  const user = await authService.register({ fullName, email, password });

  return new ApiResponse(
    201,
    { user },
    'Account created. Please check your email to verify your account.'
  ).send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await authService.verifyEmail(token);

  return new ApiResponse(200, { user }, 'Email verified successfully. You can now log in.').send(res);
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.resendVerificationEmail(email);

  return new ApiResponse(
    200,
    null,
    'If an unverified account exists for this email, a new verification link has been sent.'
  ).send(res);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({ email, password });

  setAuthCookies(res, { accessToken, refreshToken });

  return new ApiResponse(200, { user }, 'Logged in successfully').send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.refreshSession(
    refreshToken
  );

  setAuthCookies(res, { accessToken, refreshToken: newRefreshToken });

  return new ApiResponse(200, { user }, 'Session refreshed').send(res);
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookies(res);
  return new ApiResponse(200, null, 'Logged out successfully').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);

  return new ApiResponse(
    200,
    null,
    'If an account exists for this email, a password reset link has been sent.'
  ).send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword({ token, password });

  return new ApiResponse(200, null, 'Password reset successfully. Please log in.').send(res);
});

const me = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: req.user }, 'Current user').send(res);
});

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
