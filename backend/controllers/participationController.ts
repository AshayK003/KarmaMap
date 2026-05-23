import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../services/supabase.js';
import { sendCompletionEmail } from '../services/emailService.js';

export const completeGigSchema = z.object({
  hours: z.coerce.number().min(0.5).max(24),
  before_photo_url: z.string().min(1).optional(),
  after_photo_url: z.string().min(1).optional(),
});

export async function completeParticipation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const participationId = String(req.params.participationId);
  const body = req.body as z.infer<typeof completeGigSchema>;

  const { data: participation, error } = await supabaseAdmin
    .from('participations')
    .update({
      status: 'completed',
      hours: body.hours,
      before_photo_url: body.before_photo_url,
      after_photo_url: body.after_photo_url,
    })
    .eq('id', participationId)
    .eq('volunteer_id', req.user!.id)
    .select('*, gigs(title)')
    .single();

  if (error || !participation) {
    res.status(400).json({ error: error?.message ?? 'Participation not found' });
    return;
  }

  const karmaEarned = Math.round(body.hours * 10);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('karma_points, streak, name')
    .eq('id', req.user!.id)
    .single();

  await supabaseAdmin
    .from('profiles')
    .update({
      karma_points: (profile?.karma_points ?? 0) + karmaEarned,
      streak: (profile?.streak ?? 0) + 1,
    })
    .eq('id', req.user!.id);

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(req.user!.id);
  const gigTitle = (participation as { gigs?: { title: string } }).gigs?.title ?? 'Gig';

  if (user.user?.email) {
    await sendCompletionEmail(user.user.email, profile?.name ?? 'Volunteer', gigTitle);
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: req.user!.id,
    message: `You earned ${karmaEarned} karma points for completing "${gigTitle}"!`,
    read_status: false,
  });

  res.json({ participation, karma_earned: karmaEarned });
}

export async function joinGig(req: AuthRequest, res: Response): Promise<void> {
  const gigId = String(req.params.gigId);

  const { data, error } = await supabaseAdmin
    .from('participations')
    .insert({
      volunteer_id: req.user!.id,
      gig_id: gigId,
      status: 'joined',
    })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({ participation: data });
}
