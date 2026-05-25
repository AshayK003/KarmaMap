import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createPayment as createPaymentService,
  confirmPayment as confirmPaymentService,
  getNgoPayments as getPaymentsService,
} from '../services/paymentService.js';

export const createPaymentSchema = z.object({
  gig_id: z.string().uuid(),
  hours: z.number().positive().max(720),
});

export const confirmPaymentSchema = z.object({
  payment_id: z.string().uuid(),
});

async function _createPayment(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const { gig_id, hours } = req.body as z.infer<typeof createPaymentSchema>;

  const payment = await createPaymentService(gig_id, ngoId, hours);
  res.status(201).json({ payment });
}

async function _confirmPayment(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const paymentId = req.params.paymentId;

  if (!paymentId || typeof paymentId !== 'string' || paymentId.trim() === '') {
    res.status(400).json({ error: 'Missing paymentId parameter' });
    return;
  }

  const result = await confirmPaymentService(paymentId, ngoId);
  res.json(result);
}

async function _getPayments(req: AuthRequest, res: Response): Promise<void> {
  const ngoId = req.user!.id;
  const payments = await getPaymentsService(ngoId);
  res.json({ payments });
}

export const createPayment = asyncHandler(_createPayment);
export const confirmPayment = asyncHandler(_confirmPayment);
export const getPayments = asyncHandler(_getPayments);
