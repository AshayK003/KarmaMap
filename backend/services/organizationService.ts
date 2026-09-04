import { logger } from '../src/lib/logger.js';
import { supabaseAdmin } from './supabase.js';

const PGRST_TABLE_NOT_FOUND = 'PGRST202';

function requireTables(error: { code?: string; message?: string }): void {
  if (error.code === PGRST_TABLE_NOT_FOUND) {
    throw Object.assign(
      new Error('Organization features not configured. Ask an admin to apply the database migration.'),
      { statusCode: 503 },
    );
  }
}

export interface OrgAnalyticsResult {
  total_hours: number;
  active_members: number;
  total_members: number;
  completed_count: number;
  hours_by_department: Array<{ department: string; hours: number }>;
  hours_by_month: Array<{ month: string; hours: number }>;
  recent_activities: Array<{
    volunteer_name: string;
    gig_title: string;
    hours: number;
    date: string;
  }>;
}

interface MemberInfo {
  name: string;
  department: string | null;
}

async function getAdminOrgId(profileId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', profileId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    requireTables(error);
    logger.error({ profileId, error: error.message }, 'Failed to check admin status');
    throw Object.assign(new Error('Failed to verify permissions'), { statusCode: 500 });
  }

  if (!data) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }

  return data.organization_id;
}

async function getMemberOrgId(profileId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    requireTables(error);
    throw Object.assign(new Error('Not a member of any organization'), { statusCode: 403 });
  }
  if (!data) {
    throw Object.assign(new Error('Not a member of any organization'), { statusCode: 403 });
  }

  return data.organization_id;
}

export async function getOrgAnalytics(profileId: string): Promise<OrgAnalyticsResult> {
  const orgId = await getMemberOrgId(profileId);

  const { data: members, error: mErr } = await supabaseAdmin
    .from('organization_members')
    .select('profile_id, department, role, profiles!inner(name)')
    .eq('organization_id', orgId)
    .eq('opted_in', true);

  if (mErr) {
    logger.error({ orgId, error: mErr.message }, 'Failed to fetch org members');
    throw new Error('Failed to fetch analytics');
  }

  const allMembers: Array<{ profile_id: string; role: string }> = [];
  const { data: allM, error: allErr } = await supabaseAdmin
    .from('organization_members')
    .select('profile_id, role')
    .eq('organization_id', orgId);

  // A failed member scan must fail the report, not silently zero the headcount.
  if (allErr || !allM) {
    logger.error({ orgId, error: allErr?.message }, 'Failed to fetch all org members');
    throw new Error('Failed to fetch analytics');
  }
  allMembers.push(...allM);

  const totalMembers = allMembers.length;
  const optedInMemberIds = new Set((members ?? []).map((m) => m.profile_id));
  const memberInfo = new Map<string, MemberInfo>();

  for (const m of members ?? []) {
    memberInfo.set(m.profile_id, {
      name: (m as unknown as { profiles: { name: string } }).profiles?.name ?? 'Unknown',
      department: m.department,
    });
  }

  const optedInIds = [...optedInMemberIds];

  if (optedInIds.length === 0) {
    return {
      total_hours: 0,
      active_members: 0,
      total_members: totalMembers,
      completed_count: 0,
      hours_by_department: [],
      hours_by_month: [],
      recent_activities: [],
    };
  }

  // PostgREST URLs cap out on giant id lists: page instead of one huge .in().
  const completed: any[] = [];
  for (let i = 0; i < optedInIds.length; i += 200) {
    const { data: page, error: pageErr } = await supabaseAdmin
      .from('participations')
      .select('volunteer_id, hours, created_at, gigs!inner(title, gig_date)')
      .in('volunteer_id', optedInIds.slice(i, i + 200))
      .eq('status', 'completed');
    if (pageErr) {
      logger.error({ orgId, error: pageErr.message }, 'Failed to fetch participations');
      throw new Error('Failed to fetch analytics');
    }
    completed.push(...(page ?? []));
  }
  let totalHours = 0;
  const deptHours = new Map<string, number>();
  const monthHours = new Map<string, number>();
  const recent: OrgAnalyticsResult['recent_activities'] = [];
  const volunteersWithHours = new Set<string>();

  for (const p of completed) {
    const hours = Number(p.hours ?? 0);
    totalHours += hours;

    const info = memberInfo.get(p.volunteer_id);
    const dept = info?.department ?? 'Unspecified';
    deptHours.set(dept, (deptHours.get(dept) ?? 0) + hours);

    const month = (p.gigs as unknown as { gig_date: string }).gig_date?.slice(0, 7) ?? 'Unknown';
    monthHours.set(month, (monthHours.get(month) ?? 0) + hours);

    volunteersWithHours.add(p.volunteer_id);

    recent.push({
      volunteer_name: info?.name ?? 'Unknown',
      gig_title: (p.gigs as unknown as { title: string }).title ?? 'Gig',
      hours,
      date: (p.gigs as unknown as { gig_date: string }).gig_date ?? '',
    });
  }

  recent.sort((a, b) => b.date.localeCompare(a.date));
  const topRecent = recent.slice(0, 20);

  const hoursByDepartment = [...deptHours.entries()]
    .map(([department, hours]) => ({ department, hours }))
    .sort((a, b) => b.hours - a.hours);

  const hoursByMonth = [...monthHours.entries()]
    .map(([month, hours]) => ({ month, hours }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    total_hours: totalHours,
    active_members: volunteersWithHours.size,
    total_members: totalMembers,
    completed_count: completed.length,
    hours_by_department: hoursByDepartment,
    hours_by_month: hoursByMonth,
    recent_activities: topRecent,
  };
}

export async function getMyOrg(profileId: string) {
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('role, department, opted_in, organizations!inner(name, slug)')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    requireTables(error);
    logger.error(
      {
        profileId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      'Failed to fetch org membership',
    );
    // Never echo raw PostgREST internals to the client.
    throw Object.assign(new Error('Failed to fetch organization'), { statusCode: 400 });
  }

  return data;
}

export async function updateOptIn(
  profileId: string,
  optedIn: boolean,
): Promise<Record<string, unknown>> {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existingErr) {
    requireTables(existingErr);
    logger.error({ profileId, error: existingErr.message }, 'Failed to check org membership');
    throw Object.assign(new Error('Not a member of any organization'), { statusCode: 403 });
  }
  if (!existing) {
    throw Object.assign(new Error('Not a member of any organization'), { statusCode: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .update({ opted_in: optedIn })
    .eq('profile_id', profileId)
    .select()
    .single();

  if (error) {
    logger.error({ profileId, optedIn, error: error.message }, 'Failed to update opt-in');
    throw new Error('Failed to update sharing preference');
  }

  return data;
}

export async function addOrgMember(
  adminProfileId: string,
  targetProfileId: string,
  department?: string,
): Promise<Record<string, unknown>> {
  const orgId = await getAdminOrgId(adminProfileId);

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .insert({
      organization_id: orgId,
      profile_id: targetProfileId,
      role: 'member',
      department: department ?? null,
      opted_in: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(new Error('User is already a member'), { statusCode: 409 });
    }
    if (error.code === '23503') {
      // Foreign key violation: the target profile does not exist.
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    logger.error({ orgId, targetProfileId, error: error.message }, 'Failed to add member');
    throw new Error('Failed to add member');
  }

  return data;
}

export async function getOrgMembers(
  adminProfileId: string,
): Promise<Array<Record<string, unknown>>> {
  const orgId = await getAdminOrgId(adminProfileId);

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('*, profiles!inner(id, name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    requireTables(error);
    logger.error({ orgId, error: error.message, details: error }, 'Failed to list members');
    throw Object.assign(new Error('Failed to fetch members'), { statusCode: 400 });
  }

  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function getOrgName(profileId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('organizations!inner(name)')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    requireTables(error);
    // A real DB error is not "not a member" — surfacing null here made every
    // outage look like a non-membership and hid it from monitoring.
    logger.error({ profileId, error: error.message }, 'Failed to fetch org name');
    throw Object.assign(new Error('Failed to fetch organization'), { statusCode: 400 });
  }
  if (!data) return null;

  return (data as unknown as { organizations: { name: string } }).organizations?.name ?? null;
}
