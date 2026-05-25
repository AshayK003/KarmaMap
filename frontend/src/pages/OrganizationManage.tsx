import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2Icon, UsersIcon, UserCircleIcon, XIcon } from '../components/NavIcons';
import { toast } from 'sonner';
import type { OrganizationMember } from '../types/database';

export function OrganizationManage() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState('');
  const [department, setDepartment] = useState('');
  const [adding, setAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orgRes = await apiFetch<{ org: { role: string; organizations: { name: string } } | null }>('/api/organizations/my-org');
      if (!orgRes.org) {
        setError('You are not a member of any organization');
        setLoading(false);
        return;
      }
      setIsAdmin(orgRes.org.role === 'admin');
      setOrgName(orgRes.org.organizations?.name ?? null);
      if (orgRes.org.role !== 'admin') {
        setLoading(false);
        return;
      }
      const membersRes = await apiFetch<{ members: OrganizationMember[] }>('/api/organizations/members');
      setMembers(membersRes.members);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load organization';
      console.error('OrganizationManage fetch error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId.trim()) return;
    setAdding(true);
    try {
      await apiFetch('/api/organizations/members', {
        method: 'POST',
        body: { profile_id: profileId.trim(), department: department.trim() || undefined },
      });
      toast.success('Member added');
      setProfileId('');
      setDepartment('');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }, [profileId, department, fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 dark:border-red-800 dark:bg-red-900/20">
          <Building2Icon className="mx-auto h-10 w-10 text-red-400" />
          <h2 className="mt-3 text-lg font-bold text-red-700 dark:text-red-400">
            {error === 'You are not a member of any organization' ? 'Not a Member' : 'Something went wrong'}
          </h2>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card className="p-8 text-center">
          <UsersIcon className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-lg font-bold text-slate-700 dark:text-slate-300">Admin Access Required</h2>
          <p className="mt-1 text-sm text-slate-500">Only organization admins can manage team members.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md">
          <Building2Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{orgName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your team members</p>
        </div>
      </div>

      {/* Add member form */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Add Team Member</h2>
        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="profile-id" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Profile ID (UUID)</label>
            <Input
              id="profile-id"
              placeholder="Enter member's profile UUID"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              required
              inputMode="text"
              autoComplete="off"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="dept" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Department</label>
            <Input
              id="dept"
              placeholder="e.g. Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              inputMode="text"
              autoComplete="organization"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={adding || !profileId.trim()}>
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Members list */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
          Team Members
          <Badge variant="default" className="ml-2 text-xs">{members.length}</Badge>
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No members yet. Add your first team member above.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <UserCircleIcon className="h-8 w-8 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {m.profiles?.name ?? m.profile_id.slice(0, 8) + '...'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{m.department ?? 'No department'}</span>
                      <Badge variant={m.role === 'admin' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                        {m.role}
                      </Badge>
                      {m.opted_in && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                          opted in
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}