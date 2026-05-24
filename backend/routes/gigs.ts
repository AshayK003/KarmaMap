import { Router } from 'express';
import { verifyJwt, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  createGig,
  createGigSchema,
  updateGig,
  updateGigSchema,
  getNgoAnalytics,
  featureGig,
  featureGigSchema,
  triggerMatching,
} from '../controllers/gigController.js';

const router = Router();

router.post(
  '/',
  verifyJwt,
  requireRole('ngo'),
  validateBody(createGigSchema),
  createGig
);

router.get('/analytics', verifyJwt, requireRole('ngo'), getNgoAnalytics);

router.post(
  '/:gigId/match',
  verifyJwt,
  requireRole('ngo'),
  triggerMatching
);

router.patch(
  '/:gigId/feature',
  verifyJwt,
  requireRole('ngo'),
  validateBody(featureGigSchema),
  featureGig
);

router.patch(
  '/:gigId',
  verifyJwt,
  requireRole('ngo'),
  validateBody(updateGigSchema),
  updateGig
);

export default router;
