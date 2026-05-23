import { Router } from 'express';
import { verifyJwt, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  completeParticipation,
  completeGigSchema,
  joinGig,
} from '../controllers/participationController.js';

const router = Router();

router.post(
  '/join/:gigId',
  verifyJwt,
  requireRole('volunteer'),
  joinGig
);

router.patch(
  '/:participationId/complete',
  verifyJwt,
  requireRole('volunteer'),
  validateBody(completeGigSchema),
  completeParticipation
);

export default router;
