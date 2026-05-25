import { Router } from 'express';
import {
  createGig,
  createGigSchema,
  featureGig,
  featureGigSchema,
  getNgoAnalytics,
  triggerMatching,
} from '../controllers/gigController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/', verifyJwt, requireRole('ngo'), validateBody(createGigSchema), createGig);

router.get('/analytics', verifyJwt, requireRole('ngo'), getNgoAnalytics);

router.post('/:gigId/match', verifyJwt, requireRole('ngo'), triggerMatching);

router.patch(
  '/:gigId/feature',
  verifyJwt,
  requireRole('ngo'),
  validateBody(featureGigSchema),
  featureGig,
);

export default router;
