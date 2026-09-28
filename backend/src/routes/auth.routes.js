/**
 * Auth routes — PRD §30.
 */

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  adminLoginLimiter,
} = require('../middleware/rateLimit');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  registerLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post(
  '/admin/login',
  adminLoginLimiter,
  validate(loginSchema),
  authController.adminLogin
);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/admin/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.adminForgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.get('/me', authenticate, authController.me);

module.exports = router;
