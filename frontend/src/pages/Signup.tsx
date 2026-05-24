import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const defaultRole = (params.get('role') as UserRole) || 'volunteer';
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
      ? data.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const { error } = await signUp(
      data.email,
      data.password,
      data.name,
      data.role,
      skills
    );

    if (error) {
      setError('root', { message: error.message });
      return;
    }

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
            🌱
          </span>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">Create Account</h1>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-400">Join KarmaMap to start making a real community impact</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Beautiful Segmented Role Toggles */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">I am joining as a</label>
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
                <span className="text-xl mb-1">🤝</span>
                <span className="text-xs font-extrabold">Volunteer</span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">Help out & earn points</span>
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
                <span className="text-xl mb-1">🏢</span>
                <span className="text-xs font-extrabold">NGO / Cause</span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">Post gigs & find help</span>
              </button>
            </div>
          </div>

          {/* Full Name input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                👤
              </span>
              <input
                {...register('name')}
                type="text"
                placeholder="John Doe"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                ⚠️ {errors.name.message}
              </p>
            )}
          </div>

          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                ✉️
              </span>
              <input
                {...register('email')}
                type="email"
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                ⚠️ {errors.email.message}
              </p>
            )}
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                🔒
              </span>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm select-none transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                ⚠️ {errors.password.message}
              </p>
            )}
          </div>

          {/* Skills input field - dynamically displayed for Volunteers */}
          {role === 'volunteer' && (
            <div className="space-y-1 animate-fade-in">
              <label className="text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider block">Skills (comma-separated)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                  💡
                </span>
                <input
                  {...register('skills')}
                  placeholder="teaching, gardening, first-aid"
                  className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-800/40 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
                />
              </div>
            </div>
          )}

          {errors.root && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-slate-700 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              ⚠️ {errors.root.message}
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
          <Link to="/login" className="text-emerald-600 hover:underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}
