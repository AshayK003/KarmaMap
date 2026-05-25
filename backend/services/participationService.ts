import { logger } from '../src/lib/logger.js';
import { sendCompletionEmail } from './emailService.js';
import { supabaseAdmin } from './supabase.js';

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
  input: CompleteGigInput,
): Promise<CompleteGigResult> {
  const { data: participation, error: fetchError } = await supabaseAdmin
    .from('participations')
    .select('gig_id')
    .eq('id', participationId)
    .eq('volunteer_id', volunteerId)
    .single();

  if (fetchError || !participation) {
    logger.error(
      { participationId, volunteerId, error: fetchError?.message },
      'Participation not found for completion',
    );
    throw new Error('Participation not found');
  }

  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('title')
    .eq('id', participation.gig_id)
    .single();

  const gigTitle = gig?.title ?? 'Gig';

  const karmaEarned = await awardKarma(volunteerId, input.hours);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('participations')
    .update({
      status: 'completed',
      hours: input.hours,
      before_photo_url: input.before_photo_url,
      after_photo_url: input.after_photo_url,
    })
    .eq('id', participationId)
    .eq('volunteer_id', volunteerId)
    .select()
    .single();

  if (updateError || !updated) {
    logger.error(
      { participationId, error: updateError?.message },
      'Failed to update participation after karma award',
    );
    throw new Error('Failed to complete participation');
  }

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
    logger.warn(
      { participationId, error: notifError.message },
      'Failed to insert completion notification',
    );
  }

  try {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(volunteerId);
    if (user?.user?.email) {
      await sendCompletionEmail(user.user.email, profile?.name ?? 'Volunteer', gigTitle);
    }
  } catch {
    logger.warn({ volunteerId }, 'Failed to send completion email');
  }

  return { participation: updated, karma_earned: karmaEarned };
}

export async function joinGig(gigId: string, volunteerId: string): Promise<JoinGigResult> {
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
    logger.error({ gigId, volunteerId, error: error.message }, 'Failed to join gig');
    throw Object.assign(new Error('Failed to join gig'), { statusCode: 400 });
  }

  return { participation: data };
}

export async function awardKarma(volunteerId: string, hours: number): Promise<number> {
  const karmaEarned = Math.round(hours * 10);

  const { data, error } = await supabaseAdmin.rpc('award_karma', {
    p_user_id: volunteerId,
    p_hours: hours,
  });

  if (!error && typeof data === 'number') {
    return data;
  }

  logger.warn(
    { volunteerId, error: error?.message },
    'award_karma RPC unavailable, falling back to direct update',
  );

  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('karma_points, streak')
    .eq('id', volunteerId)
    .single();

  if (fetchError) {
    logger.error({ volunteerId, error: fetchError.message }, 'Failed to fetch profile for karma');
    throw Object.assign(new Error('Failed to award karma'), { statusCode: 400 });
  }

  const currentKarma = profile?.karma_points ?? 0;
  const currentStreak = profile?.streak ?? 0;

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      karma_points: currentKarma + karmaEarned,
      streak: currentStreak + 1,
    })
    .eq('id', volunteerId);

  if (updateError) {
    logger.error({ volunteerId, error: updateError.message }, 'Failed to update karma');
    throw Object.assign(new Error('Failed to award karma'), { statusCode: 400 });
  }

  return karmaEarned;
}
