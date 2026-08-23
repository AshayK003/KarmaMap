import { Router } from 'express';
import { z } from 'zod';
import {
  completeGigSchema,
  completeParticipation,
  joinGig,
} from '../controllers/participationController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

const gigIdParams = z.object({ gigId: z.string().uuid() });
const participationIdParams = z.object({ participationId: z.string().uuid() });

router.post(
  '/join/:gigId',
  verifyJwt,
  requireRole('volunteer'),
  validateParams(gigIdParams),
  joinGig,
);

router.patch(
  '/:participationId/complete',
  verifyJwt,
  requireRole('volunteer'),
  validateParams(participationIdParams),
  validateBody(completeGigSchema),
  completeParticipation,
);

export default router;
