/**
 * Admin login page — PRD §36 (Admin Navigation implies a login entry
 * point) and §116 (Admin Design Language: dense, fast, no elaborate
 * marketing visuals — unlike the public app's homepage in §18).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { loginSchema } from '../../validators/auth.schema';
import { getErrorMessage } from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      setServerError(getErrorMessage(error, 'Invalid email or password'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">SafarUp Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage trips, bookings and operations.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Email" id="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@safarup.in"
              {...register('email')}
            />
          </FormField>

          <FormField label="Password" id="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <Link
          to="/forgot-password"
          className="mt-4 block text-center text-sm text-brand-600 hover:text-brand-700"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}
