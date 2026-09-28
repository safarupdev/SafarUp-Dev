import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../../api/auth.api';
import { resetPasswordSchema } from '../../validators/resetPassword.schema';
import { getErrorMessage } from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    if (!token) {
      setServerError('This reset link is missing its token. Please request a new one.');
      return;
    }
    try {
      await resetPassword({ token, ...values });
      navigate('/login', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, 'This reset link is invalid or has expired.'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Set a new password</h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="New password" id="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </FormField>

          <FormField
            label="Confirm new password"
            id="confirmPassword"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </FormField>

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Reset password
          </Button>
        </form>

        <Link to="/login" className="mt-4 block text-center text-sm text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
