import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    const { data: session } = await import('../lib/supabase').then((m) =>
      m.supabase.auth.getSession()
    );
    const userId = session.session?.user?.id;
    if (userId) {
      const { data: prof } = await import('../lib/supabase').then((m) =>
        m.supabase.from('profiles').select('role').eq('id', userId).single()
      );
      navigate(prof?.role === 'ngo' ? '/ngo/dashboard' : '/map');
    } else {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-tr from-emerald-50 via-white to-teal-50 px-4 py-12 relative overflow-hidden select-none">
      {/* Blurred decorative background meshes */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />

      {/* Premium Glassmorphic card container */}
      <div className="w-full max-w-md bg-white/90 border border-emerald-100/80 rounded-2xl p-8 shadow-xl shadow-emerald-950/2 relative z-10 backdrop-blur-xs transition-all hover:shadow-2xl">
        <div className="text-center space-y-2 mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700 shadow-sm shadow-emerald-500/10">
            🌱
          </span>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Welcome Back</h1>
          <p className="text-xs font-semibold text-gray-400">Enter your credentials to access your KarmaMap hub</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                ✉️
              </span>
              <input
                {...register('email')}
                type="email"
                placeholder="name@example.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/30 text-gray-800 placeholder-gray-400 transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 select-none text-sm">
                🔒
              </span>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/30 text-gray-800 placeholder-gray-400 transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-sm select-none transition-colors"
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

          {errors.root && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-xs font-bold text-rose-600">
              ⚠️ {errors.root.message}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-500/10 hover:shadow-md transition-all duration-200 disabled:opacity-50 pt-2.5"
          >
            {isSubmitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Signup Navigation Link */}
        <p className="mt-6 text-center text-xs font-bold text-gray-400">
          New to the community?{' '}
          <Link to="/signup" className="text-emerald-600 hover:underline hover:text-emerald-700">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
