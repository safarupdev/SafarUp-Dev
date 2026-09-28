/**
 * PRD §30/§146 (Refund Policy Display is unrelated, but the same "no
 * hidden state, always tell the user what happened" principle applies
 * here): after submitting, show a clear confirmation rather than silently
 * redirecting, since the backend intentionally never reveals whether the
 * email exists (enumeration hardening — see backend auth.service.js).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

import { forgotPassword } from '../../api/auth.api';
import { forgotPasswordSchema } from '../../validators/auth.schema';
import { getErrorMessage } from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await forgotPassword(values);
      setIsSent(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>

        {isSent ? (
          <p className="mt-4 text-sm text-slate-600">
            If an account exists for that email, a password reset link has been sent. Please check
            your inbox.
          </p>
        ) : (
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

            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {serverError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
              Send reset link
            </Button>
          </form>
        )}

        <Link to="/login" className="mt-4 block text-center text-sm text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
