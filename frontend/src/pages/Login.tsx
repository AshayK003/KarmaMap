import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    } catch {
      navigate('/map');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-tr from-emerald-50 via-white to-teal-50 px-4 py-12 relative overflow-hidden select-none">
      {/* Blurred decorative background meshes */}
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />

      {/* Premium Glassmorphic card container */}
      <Card className="w-full max-w-md p-6 sm:p-8">
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
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Signup Navigation Link */}
        <p className="mt-6 text-center text-xs font-bold text-gray-400">
          New to the community?{' '}
          <Link to="/signup" className="text-emerald-600 hover:underline hover:text-emerald-700">
            Create an Account
          </Link>
        </p>
      </Card>
    </div>
  );
}
