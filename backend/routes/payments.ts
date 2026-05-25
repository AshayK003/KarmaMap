import { Router } from 'express';
import {
  confirmPayment,
  createPayment,
  createPaymentSchema,
  getPayments,
} from '../controllers/paymentController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/', verifyJwt, requireRole('ngo'), validateBody(createPaymentSchema), createPayment);

router.post('/:paymentId/confirm', verifyJwt, requireRole('ngo'), confirmPayment);

router.get('/', verifyJwt, requireRole('ngo'), getPayments);

export default router;
