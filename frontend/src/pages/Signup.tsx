import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Handshake, Sprout } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types/database';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['volunteer', 'ngo']),
  skills: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function Signup() {
  const [params] = useSearchParams();
  // Whitelist the role param: anything else (e.g. ?role=admin) silently broke
  // validation with no visible error. Unknown values fall back to volunteer.
  const rawRole = params.get('role');
  const defaultRole: UserRole = rawRole === 'ngo' ? 'ngo' : 'volunteer';
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: defaultRole },
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    const skills = data.skills
      ? data.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const { error } = await signUp(data.email, data.password, data.name, data.role, skills);

    if (error) {
      setError('root', { message: error.message });
      return;
    }

    // With email confirmation enabled there is no session yet: sending the
    // user to a protected route would bounce them straight back to login.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.success('Account created! Check your email to verify your account.');
        navigate('/login');
        return;
      }
    } catch {
      // If the session check itself fails, fall through to the role route —
      // ProtectedRoute will redirect to login if there is really no session.
    }

    toast.success('Account created! Check your email to verify your account.');
    navigate(data.role === 'ngo' ? '/ngo/dashboard' : '/map');
  };

  const handleRoleSelect = (selectedRole: 'volunteer' | 'ngo') => {
    setValue('role', selectedRole);
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
            <Sprout className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
            Create Account
          </h1>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-400">
            Join KarmaMap to start making a real community impact
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Beautiful Segmented Role Toggles */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">
              I am joining as a
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('volunteer')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 text-center transition-all duration-200 select-none ${
                  role === 'volunteer'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 shadow-2xs dark:shadow-none dark:shadow-slate-900/50'
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <Handshake className="h-5 w-5 mb-1" />
                <span className="text-xs font-extrabold">Volunteer</span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">
                  Help out & earn points
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('ngo')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 text-center transition-all duration-200 select-none ${
                  role === 'ngo'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 shadow-2xs dark:shadow-none dark:shadow-slate-900/50'
                    : 'border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <Building2 className="h-5 w-5 mb-1" />
                <span className="text-xs font-extrabold">NGO / Cause</span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">
                  Post gigs & find help
                </span>
              </button>
            </div>
          </div>

          {/* Full Name input field */}
          <div className="space-y-1">
            <label
              htmlFor="signup-name"
              className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block"
            >
              Full Name
            </label>
            <div className="relative">
              <span
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </span>
              <input
                {...register('name')}
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
            {errors.name && (
              <p
                className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1"
                role="alert"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                  />
                </svg>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email input field */}
          <div className="space-y-1">
            <label
              htmlFor="signup-email"
              className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block"
            >
              Email Address
            </label>
            <div className="relative">
              <span
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </span>
              <input
                {...register('email')}
                id="signup-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
            {errors.email && (
              <p
                className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1"
                role="alert"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                  />
                </svg>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <label
              htmlFor="signup-password"
              className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block"
            >
              Password
            </label>
            <div className="relative">
              <span
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <input
                {...register('password')}
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p
                className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1"
                role="alert"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                  />
                </svg>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Skills input field - dynamically displayed for Volunteers */}
          {role === 'volunteer' && (
            <div className="space-y-1 animate-fade-in">
              <label
                htmlFor="signup-skills"
                className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block"
              >
                Skills (comma-separated)
              </label>
              <div className="relative">
                <span
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none pointer-events-none"
                  aria-hidden="true"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </span>
                <input
                  {...register('skills')}
                  id="signup-skills"
                  placeholder="teaching, gardening, first-aid"
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
                />
              </div>
            </div>
          )}

          {errors.root && (
            <div
              className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-slate-700 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400"
              role="alert"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {errors.root.message}
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

        {/* Login Navigation Link */}
        <p className="mt-6 text-center text-xs font-bold text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-600 hover:underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}
