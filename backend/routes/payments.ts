import { Router } from 'express';
import { verifyJwt, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createPayment,
  createPaymentSchema,
  confirmPayment,
  getPayments,
} from '../controllers/paymentController.js';

const router = Router();

router.post(
  '/',
  verifyJwt,
  requireRole('ngo'),
  validateBody(createPaymentSchema),
  createPayment
);

router.post(
  '/:paymentId/confirm',
  verifyJwt,
  requireRole('ngo'),
  confirmPayment
);

router.get(
  '/',
  verifyJwt,
  requireRole('ngo'),
  getPayments
);

export default router;
