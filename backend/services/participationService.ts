import { supabaseAdmin } from './supabase.js';
import { sendCompletionEmail } from './emailService.js';

export interface CompleteGigInput {
  hours: number;
  before_photo_url?: string;
  after_photo_url?: string;
}

export interface CompleteGigResult {
  participation: Record<string, unknown>;
  karma_earned: number;
}

export interface JoinGigResult {
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
    console.warn('Failed to insert completion notification:', notifError.message);
  }

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(volunteerId);
  if (user.user?.email) {
    await sendCompletionEmail(user.user.email, profile?.name ?? 'Volunteer', gigTitle);
  }

  return { participation, karma_earned: karmaEarned };
}

export async function joinGig(
  gigId: string,
  volunteerId: string
): Promise<JoinGigResult> {
  const { data: existing } = await supabaseAdmin
    .from('participations')
    .select('id')
    .eq('volunteer_id', volunteerId)
    .eq('gig_id', gigId)
    .maybeSingle();

  if (existing) {
    throw Object.assign(new Error('You have already joined this gig.'), { statusCode: 409 });
  }

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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('karma_points, streak')
    .eq('id', volunteerId)
    .single();

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      karma_points: (profile?.karma_points ?? 0) + karmaEarned,
      streak: (profile?.streak ?? 0) + 1,
    })
    .eq('id', volunteerId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return karmaEarned;
}
