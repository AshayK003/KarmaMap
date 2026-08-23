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

/**
 * Completes a participation and awards karma in a single database transaction
 * (complete_participation RPC). The RPC verifies the participation belongs to
 * the volunteer, guards against double completion, and only awards karma after
 * the status update succeeds — so a failure can never pay karma for work that
 * was not recorded.
 */
export async function completeParticipation(
  participationId: string,
  volunteerId: string,
  input: CompleteGigInput,
): Promise<CompleteGigResult> {
  const { data, error } = await supabaseAdmin.rpc('complete_participation', {
    p_participation_id: participationId,
    p_volunteer_id: volunteerId,
    p_hours: input.hours,
    p_before_photo_url: input.before_photo_url ?? null,
    p_after_photo_url: input.after_photo_url ?? null,
  });

  if (error || !data) {
    logger.error(
      { participationId, volunteerId, error: error?.message },
      'Atomic participation completion failed',
    );
    throw Object.assign(new Error('Failed to complete participation'), { statusCode: 400 });
  }

  const participation = data as Record<string, unknown>;
  // The RPC awards round(hours * 10) points atomically alongside the update.
  const karmaEarned = Math.round(input.hours * 10);

  notifyAndEmail(volunteerId, participation, String(participation.gig_id ?? ''), karmaEarned);

  return { participation, karma_earned: karmaEarned };
}

/** Best-effort notification + email; failures are logged, never thrown. */
async function notifyAndEmail(
  volunteerId: string,
  participation: Record<string, unknown>,
  _gigId: string,
  karmaEarned: number,
): Promise<void> {
  try {
    const gigTitle = await fetchGigTitleForParticipation(participation);
    const [profileResult, notifResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('name').eq('id', volunteerId).single(),
      supabaseAdmin.from('notifications').insert({
        user_id: volunteerId,
        message: `You earned ${karmaEarned} karma points for completing "${gigTitle}"!`,
        read_status: false,
      }),
    ]);

    if (notifResult.error) {
      logger.warn({ error: notifResult.error.message }, 'Failed to insert completion notification');
    }

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(volunteerId);
    if (user?.user?.email) {
      await sendCompletionEmail(user.user.email, profileResult.data?.name ?? 'Volunteer', gigTitle);
    }
  } catch {
    logger.warn({ volunteerId }, 'Post-completion notification/email failed');
  }
}

async function fetchGigTitleForParticipation(
  participation: Record<string, unknown>,
): Promise<string> {
  const gigId = participation.gig_id;
  if (typeof gigId !== 'string') return 'Gig';
  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('title')
    .eq('id', gigId)
    .single();
  return gig?.title ?? 'Gig';
}

/**
 * Joins a gig through the join_gig RPC, which locks the gig row, re-checks
 * capacity inside the transaction, inserts the participation, and increments
 * the counter atomically. Concurrent joins can no longer overflow capacity.
 */
export async function joinGig(gigId: string, volunteerId: string): Promise<JoinGigResult> {
  const { data, error } = await supabaseAdmin.rpc('join_gig', {
    p_gig_id: gigId,
    p_volunteer_id: volunteerId,
  });

  if (error || !data) {
    const message = error?.message ?? 'Failed to join gig';
    if (message.includes('already joined')) {
      throw Object.assign(new Error('You have already joined this gig.'), { statusCode: 409 });
    }
    if (message.includes('full')) {
      throw Object.assign(new Error('This gig is full'), { statusCode: 400 });
    }
    if (message.includes('not found')) {
      throw Object.assign(new Error('Gig not found'), { statusCode: 404 });
    }
    if (message.includes('no longer accepting')) {
      throw Object.assign(new Error('This gig is no longer accepting volunteers'), {
        statusCode: 400,
      });
    }
    logger.error({ gigId, volunteerId, error: message }, 'Atomic gig join failed');
    throw Object.assign(new Error('Failed to join gig'), { statusCode: 400 });
  }

  return { participation: data as Record<string, unknown> };
}
