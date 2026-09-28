/**
 * Client-side validation mirrors the backend's Zod rules
 * (backend/src/validators/auth.validator.js) closely enough for good UX,
 * but per PRD §101 the backend remains the authoritative validator — this
 * only prevents an obviously-invalid request from being sent at all.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});
