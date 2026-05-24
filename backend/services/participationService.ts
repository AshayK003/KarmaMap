import { supabaseAdmin } from './supabase.js';
import { logger } from '../src/lib/logger.js';
import { sendCompletionEmail } from './emailService.js';

interface CompleteGigInput {
  hours: number;
  before_photo_url?: string;
  after_photo_url?: string;
}

interface CompleteGigResult {
  participation: Record<string, unknown>;
  karma_earned: number;
}

interface JoinGigResult {
  participation: Record<string, unknown>;
}

export async function completeParticipation(
  participationId: string,
  volunteerId: string,
  input: CompleteGigInput
): Promise<CompleteGigResult> {
  const { data: participation, error } = await supabaseAdmin
    .from('participations')
    .update({
      status: 'completed',
      hours: input.hours,
      before_photo_url: input.before_photo_url,
      after_photo_url: input.after_photo_url,
    })
    .eq('id', participationId)
    .eq('volunteer_id', volunteerId)
    .select('*, gigs(title)')
    .single();

  if (error || !participation) {
    throw new Error(error?.message ?? 'Participation not found');
  }

  const gigTitle = (participation as { gigs?: { title: string } }).gigs?.title ?? 'Gig';

  const karmaEarned = await awardKarma(volunteerId, input.hours);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', volunteerId)
    .single();

  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: volunteerId,
    message: `You earned ${karmaEarned} karma points for completing "${gigTitle}"!`,
    read_status: false,
  });

  if (notifError) {
    logger.warn({ participationId, error: notifError.message }, 'Failed to insert completion notification');
  }

  try {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(volunteerId);
    if (user?.user?.email) {
      await sendCompletionEmail(user.user.email, profile?.name ?? 'Volunteer', gigTitle);
    }
  } catch {
    logger.warn({ volunteerId }, 'Failed to send completion email');
  }

  return { participation, karma_earned: karmaEarned };
}

export async function joinGig(
  gigId: string,
  volunteerId: string
): Promise<JoinGigResult> {
  const { data, error } = await supabaseAdmin
    .from('participations')
    .insert({
      volunteer_id: volunteerId,
      gig_id: gigId,
      status: 'joined',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(new Error('You have already joined this gig.'), { statusCode: 409 });
    }
    throw new Error(error.message);
  }

  return { participation: data };
}

export async function awardKarma(
  volunteerId: string,
  hours: number
): Promise<number> {
  const karmaEarned = Math.round(hours * 10);

  const { data, error } = await supabaseAdmin.rpc('award_karma', {
    p_user_id: volunteerId,
    p_hours: hours,
  });

  if (!error && typeof data === 'number') {
    return data;
  }

  logger.warn({ volunteerId, error: error?.message }, 'award_karma RPC failed, retrying once');
  const { data: data2, error: error2 } = await supabaseAdmin.rpc('award_karma', {
    p_user_id: volunteerId,
    p_hours: hours,
  });

  if (!error2 && typeof data2 === 'number') {
    return data2;
  }

  throw Object.assign(
    new Error(error2?.message ?? 'award_karma RPC unavailable — apply migration 03_atomic_karma.sql'),
    { statusCode: 400 }
  );
}
