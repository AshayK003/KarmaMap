import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/database';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['volunteer', 'ngo']),
  skills: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function Signup() {
  const [params] = useSearchParams();
  const defaultRole = (params.get('role') as UserRole) || 'volunteer';
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
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

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">I am a</label>
          <select
            {...register('role')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="volunteer">Volunteer</option>
            <option value="ngo">NGO</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            {...register('name')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            {...register('email')}
            type="email"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            {...register('password')}
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        {role === 'volunteer' && (
          <div>
            <label className="text-sm font-medium">Skills (comma-separated)</label>
            <input
              {...register('skills')}
              placeholder="teaching, gardening, first-aid"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        )}
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-white disabled:opacity-50"
        >
          Sign up
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Have an account?{' '}
        <Link to="/login" className="text-emerald-600">
          Login
        </Link>
      </p>
    </div>
  );
}
