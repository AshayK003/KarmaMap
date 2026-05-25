import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { updateUpiInfo as updateUpiService } from '../services/ngoService.js';

const upiIdPattern = /^[\w.\-_]+@[\w.\-]+$/;

export const updateUpiSchema = z.object({
  upi_id: z.string().regex(upiIdPattern, 'Invalid UPI ID format').optional(),
  upi_qr_url: z
    .string()
    .url()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return (
            parsed.hostname.endsWith('.supabase.co') &&
            parsed.pathname.includes('/ngo-qr-codes/')
          );
        } catch {
          return false;
        }
      },
      'QR code URL must be from the ngo-qr-codes storage bucket',
    )
    .optional(),
});

async function _updateUpi(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const { upi_id, upi_qr_url } = req.body as z.infer<typeof updateUpiSchema>;

  const profile = await updateUpiService(ngoId, upi_id, upi_qr_url);
  res.json({ profile });
}

export const updateUpi = asyncHandler(_updateUpi);
