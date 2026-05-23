import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
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
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            {...register('email')}
            type="email"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            {...register('password')}
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>
        {errors.root && (
          <p className="text-sm text-red-600">{errors.root.message}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        No account?{' '}
        <Link to="/signup" className="text-emerald-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
