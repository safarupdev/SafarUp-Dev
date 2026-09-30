/**
 * Modern Split-Screen Login Page — Exactly matching the user's reference design.
 *
 * Left: "Welcome back!", pill inputs (email, password with visibility toggle),
 *       full-width black pill login CTA, "or continue with" divider, and SSO icons.
 * Right: Soft sage-tinted showcase card with flow illustration, floating task/progress card,
 *        carousel indicators, and inspiring headline.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../validators/auth.schema';
import { getErrorMessage } from '../../lib/apiClient';
import Icon from '../../components/common/Icon';
import Logo from '../../components/common/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (!error?.response) {
        setServerError(
          'Cannot connect to backend server at http://localhost:4000. Please ensure the backend server is running.'
        );
        return;
      }
      if (error.response.status === 403) {
        setServerError('This account is not authorized to access the Admin Console.');
        return;
      }
      setServerError(getErrorMessage(error, 'Invalid email or password'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eaedf2] p-4 sm:p-6 lg:p-8 antialiased">
      {/* Outer Browser Mockup Window Frame (from reference image) */}
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-2xl">
        {/* Browser Top Navigation Bar */}
        <div className="flex h-11 items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-4">
          {/* Traffic Light Window Controls */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="h-3 w-3 rounded-full bg-[#eab308]" />
            <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <div className="ml-3 hidden sm:flex items-center gap-2 text-slate-400">
              <Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" />
              <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
            </div>
          </div>

          {/* Centered URL Address Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-4 py-1 text-[11px] font-medium text-slate-500 shadow-2xs">
            <Icon name="shield" className="h-3 w-3 text-emerald-600" />
            <span>https://safarup.in/admin-login</span>
          </div>

          {/* Right Browser Controls */}
          <div className="flex items-center gap-3 text-slate-400">
            <Icon name="refresh" className="h-3.5 w-3.5 cursor-pointer hover:text-slate-600" />
            <Icon name="externalLink" className="h-3.5 w-3.5 cursor-pointer hover:text-slate-600" />
            <Icon name="plus" className="h-3.5 w-3.5 cursor-pointer hover:text-slate-600" />
          </div>
        </div>

        {/* 2-Column Main Login Layout */}
        <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-12">
          {/* Left Column: Form Section */}
          <div className="flex flex-col justify-center max-w-md mx-auto w-full">
            <div className="mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Welcome back!
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Simplify your workflow and boost your productivity with <strong className="font-semibold text-slate-800">SafarUp Console</strong>. Sign in to continue.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Username / Email Input Pill */}
              <div>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  placeholder="Username or Email"
                  {...register('email')}
                  className={`w-full rounded-full border py-3.5 px-6 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-black focus:ring-1 focus:ring-black'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 ml-4 text-xs font-semibold text-rose-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input Pill with Show/Hide Eye Toggle */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    {...register('password')}
                    className={`w-full rounded-full border py-3.5 pl-6 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                      errors.password
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:border-black focus:ring-1 focus:ring-black'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4.5 w-4.5" />
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 ml-4 text-xs font-semibold text-rose-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-slate-900 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Server Error Message */}
              {serverError && (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
                  <Icon name="alert" className="h-4 w-4 text-rose-600 flex-none mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Black Solid Pill Login Button (Exact match) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-black py-3.5 text-sm font-bold text-white shadow-sm hover:bg-slate-900 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>Login to Console</span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Visual Showcase Panel (Exact match from reference image) */}
          <div className="hidden lg:flex flex-col justify-between items-center text-center rounded-[28px] bg-[#eef6ee] p-10 relative overflow-hidden min-h-[500px]">
            {/* Top Illustration Area with Floating Bubbles */}
            <div className="relative w-full flex flex-col items-center justify-center pt-4">
              {/* Floating Top Left Avatar Bubble */}
              <div className="absolute top-2 left-8 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-slate-900 shadow-md text-white font-bold text-xs">
                JD
              </div>

              {/* Floating Right Avatar Bubble */}
              <div className="absolute top-24 right-6 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-accent-600 shadow-md text-white font-bold text-xs">
                EH
              </div>

              {/* Central Meditating Flow Artwork Graphic */}
              <div className="relative my-4 flex flex-col items-center">
                {/* Wavy thought loop overhead */}
                <div className="h-16 w-36 rounded-full border-2 border-dashed border-emerald-400/80 mb-2 opacity-70" />

                {/* Character Silhouette */}
                <div className="relative flex flex-col items-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                    <Icon name="user" className="h-8 w-8 text-emerald-100" />
                  </div>
                  <div className="mt-1 h-20 w-32 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-md">
                    {/* Heart symbol on sweater */}
                    <span className="text-white text-2xl font-bold">♥</span>
                  </div>
                  <div className="flex gap-4 -mt-2">
                    <div className="h-10 w-16 rounded-full bg-slate-800" />
                    <div className="h-10 w-16 rounded-full bg-slate-800" />
                  </div>
                </div>
              </div>

              {/* Floating Task & Progress Card (Bottom-left from reference image) */}
              <div className="absolute -bottom-4 left-4 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-lg text-left min-w-[180px] z-10 animate-fade-rise">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <img src="/safarup-logo.jpg" alt="Logo" className="h-4 w-4 rounded-xs object-contain" />
                  <p className="text-xs font-bold text-slate-900">Bihar Expeditions</p>
                </div>
                <p className="text-[10px] font-medium text-slate-400">12 Live Destinations</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">
                    Travel Ops
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent text-[8px] font-bold text-emerald-700 flex items-center justify-center">
                      94%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Carousel Dots & Tagline Headline */}
            <div className="mt-8 pt-4 w-full">
              {/* Carousel Pagination Dots (Active pill + 2 dots) */}
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="h-1.5 w-4 rounded-full bg-slate-900" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              </div>

              <h2 className="mt-5 text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
                Make your work easier and organized with <span className="font-extrabold text-black">SafarUp</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
