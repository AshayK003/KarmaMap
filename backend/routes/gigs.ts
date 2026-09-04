import { Router } from 'express';
import { z } from 'zod';
import {
  createGig,
  createGigSchema,
  featureGig,
  featureGigSchema,
  getNgoAnalytics,
  transitionGigStatus,
  gigStatusSchema,
  triggerMatching,
} from '../controllers/gigController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';

const router = Router();

const gigIdParams = z.object({ gigId: z.string().uuid() });

router.post('/', verifyJwt, requireRole('ngo'), validateBody(createGigSchema), createGig);

router.get('/analytics', verifyJwt, requireRole('ngo'), getNgoAnalytics);

router.post(
  '/:gigId/match',
  verifyJwt,
  requireRole('ngo'),
  validateParams(gigIdParams),
  triggerMatching,
);

router.patch(
  '/:gigId/feature',
  verifyJwt,
  requireRole('ngo'),
  validateParams(gigIdParams),
  validateBody(featureGigSchema),
  featureGig,
);

router.patch(
  '/:gigId/status',
  verifyJwt,
  requireRole('ngo'),
  validateParams(gigIdParams),
  validateBody(gigStatusSchema),
  transitionGigStatus,
);

export default router;
