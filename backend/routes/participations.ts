import { Router } from 'express';
import {
  completeGigSchema,
  completeParticipation,
  joinGig,
} from '../controllers/participationController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/join/:gigId', verifyJwt, requireRole('volunteer'), joinGig);

router.patch(
  '/:participationId/complete',
  verifyJwt,
  requireRole('volunteer'),
  validateBody(completeGigSchema),
  completeParticipation,
);

export default router;
