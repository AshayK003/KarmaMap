import { logger } from '../src/lib/logger.js';
import { supabaseAdmin } from './supabase.js';

export async function updateUpiInfo(
  ngoId: string,
  upiId: string | undefined | null,
  upiQrUrl: string | undefined | null,
): Promise<Record<string, unknown>> {
  const updates: Record<string, unknown> = {};
  if (upiId !== undefined) updates.upi_id = upiId || null;
  if (upiQrUrl !== undefined) updates.upi_qr_url = upiQrUrl || null;

  if (Object.keys(updates).length === 0) {
    throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', ngoId)
    .select('id, name, upi_id, upi_qr_url')
    .single();

  if (error) {
    logger.error({ ngoId, error: error.message }, 'Failed to update UPI info');
    throw new Error('Failed to update donation info');
  }

  return data;
}
