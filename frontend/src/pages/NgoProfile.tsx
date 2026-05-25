import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchPublicNgoProfile } from '../services/ngo';
import type { Profile } from '../types/database';
import { formatDate } from '../utils/format';

export function NgoProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPublicNgoProfile(id)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  const handleCopyUpi = useCallback(async () => {
    if (!profile?.upi_id) return;
    try {
      await navigator.clipboard.writeText(profile.upi_id);
      setCopied(true);
      toast.success('UPI ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy UPI ID');
    }
  }, [profile?.upi_id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
          <p className="text-xs font-bold text-slate-400">Loading NGO profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-black text-slate-700">NGO Not Found</h2>
          <p className="text-xs font-semibold text-slate-400">
            This NGO profile doesn't exist or may have been removed.
          </p>
          <Link to="/">
            <Button size="sm" variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/30 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="bg-white dark:bg-slate-800 p-6 sm:p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {profile.name}
            </h1>
            {profile.bio && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg">
                {profile.bio}
              </p>
            )}
            <p className="text-xs font-semibold text-slate-400">
              Member since {formatDate(profile.created_at, { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </Card>

        {profile.upi_id ? (
          <Card className="bg-white dark:bg-slate-800 p-6 sm:p-8">
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 mb-2">
              Support {profile.name}
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
              Donate directly via UPI. The platform never processes or holds your money.
            </p>

            <div className="space-y-5">
              {profile.upi_qr_url && (
                <div className="flex justify-center">
                  <img
                    src={profile.upi_qr_url}
                    alt={`${profile.name} UPI QR code`}
                    className="w-48 h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-600"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                <code className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-mono font-bold text-slate-700 dark:text-slate-200">
                  {profile.upi_id}
                </code>
                <Button onClick={handleCopyUpi} variant={copied ? 'default' : 'outline'} size="sm">
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {copied ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </>
                    )}
                  </svg>
                  {copied ? 'Copied!' : 'Copy UPI ID'}
                </Button>
              </div>

              <div className="flex justify-center">
                <a
                  href={`upi://pay?pa=${encodeURIComponent(profile.upi_id)}&pn=${encodeURIComponent(profile.name)}&tn=Donation via KarmaMap`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Donate via UPI
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-800 p-6 sm:p-8 text-center">
            <div className="flex flex-col items-center gap-3 py-4">
              <svg className="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                This NGO hasn't set up donation info yet.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
