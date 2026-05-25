import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setError('root', { message: error.message });
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        navigate(prof?.role === 'ngo' ? '/ngo/dashboard' : '/map');
      } else {
        navigate('/map');
      }
    } catch {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-tr from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-4 py-12 relative overflow-hidden select-none">
      {/* Blurred decorative background meshes */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-900/20 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl dark:bg-slate-800/30 pointer-events-none" />

      {/* Premium Glassmorphic card container */}
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center space-y-2 mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-2xl text-emerald-700 dark:text-emerald-400 shadow-sm dark:shadow-none dark:shadow-slate-900/50 shadow-emerald-500/10">
            🌱
          </span>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">Welcome Back</h1>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-400">Enter your credentials to access your KarmaMap hub</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email input field */}
          <div className="space-y-1">
            <label htmlFor="login-email" className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                {...register('email')}
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
            <FieldError
              message={errors.email?.message}
              icon={
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              }
            />
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <label htmlFor="login-password" className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                {...register('password')}
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm select-none transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <FieldError
              message={errors.password?.message}
              icon={
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              }
            />
          </div>

          {errors.root && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-slate-700 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.root.message}
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Signup Navigation Link */}
        <p className="mt-6 text-center text-xs font-bold text-gray-400">
          New to the community?{' '}
          <Link to="/signup" className="text-emerald-600 hover:underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
            Create an Account
          </Link>
        </p>
      </Card>
    </div>
  );
}
