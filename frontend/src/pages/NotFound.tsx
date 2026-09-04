import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-5xl font-black tracking-tight text-slate-200 dark:text-slate-700">404</p>
        <h1 className="text-lg font-black text-slate-700 dark:text-slate-200">Page not found</h1>
        <p className="text-xs font-semibold text-slate-400">
          This link may be mistyped, or the page was moved or removed.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Link to="/">
            <Button size="sm">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
