import { logger } from '../src/lib/logger.js';
import { supabaseAdmin } from './supabase.js';

export async function createPayment(
  gigId: string,
  ngoId: string,
  hours: number,
): Promise<Record<string, unknown>> {
  const amount = hours * 10000;

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({
      gig_id: gigId,
      ngo_id: ngoId,
      amount,
      status: 'pending',
      feature_hours: hours,
    })
    .select()
    .single();

  if (error) {
    logger.error({ gigId, ngoId, error: error.message }, 'Failed to create payment');
    throw new Error('Failed to create payment request');
  }

  return data;
}

export async function confirmPayment(
  paymentId: string,
  ngoId: string,
): Promise<{ payment: Record<string, unknown>; featured_until: string }> {
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (fetchError || !payment) {
    logger.error({ paymentId, error: fetchError?.message }, 'Payment not found');
    throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  }

  if (payment.ngo_id !== ngoId) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403 });
  }

  if (payment.status !== 'pending') {
    throw Object.assign(new Error('Payment is not pending'), { statusCode: 400 });
  }

  const featuredUntil = new Date(Date.now() + payment.feature_hours * 60 * 60 * 1000).toISOString();

  const { error: gigError } = await supabaseAdmin
    .from('gigs')
    .update({ featured_until: featuredUntil })
    .eq('id', payment.gig_id);

  if (gigError) {
    logger.error(
      { paymentId, gigId: payment.gig_id, error: gigError.message },
      'Failed to feature gig',
    );
    throw new Error('Failed to feature gig');
  }

  const { data: updated, error: payError } = await supabaseAdmin
    .from('payments')
    .update({ status: 'paid' })
    .eq('id', paymentId)
    .select()
    .single();

  if (payError || !updated) {
    logger.error(
      { paymentId, error: payError?.message },
      'Failed to update payment status after gig featured',
    );
    throw new Error('Failed to confirm payment');
  }

  return { payment: updated, featured_until: featuredUntil };
}

export async function getNgoPayments(ngoId: string): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*, gigs!inner(title)')
    .eq('ngo_id', ngoId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ ngoId, error: error.message }, 'Failed to fetch payments');
    throw new Error('Failed to fetch payments');
  }

  return (data ?? []) as Array<Record<string, unknown>>;
}
