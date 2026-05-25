import { Router } from 'express';
import { verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  getAnalytics,
  getMyOrgHandler,
  updateOptInHandler,
  addMember,
  addMemberSchema,
  optInSchema,
  getMembers,
  getOrgNameHandler,
} from '../controllers/organizationController.js';

const router = Router();

router.get('/analytics', verifyJwt, getAnalytics);

router.get('/my-org', verifyJwt, getMyOrgHandler);

router.get('/org-name', verifyJwt, getOrgNameHandler);

router.patch(
  '/my-org/opt-in',
  verifyJwt,
  validateBody(optInSchema),
  updateOptInHandler
);

router.get('/members', verifyJwt, getMembers);

router.post(
  '/members',
  verifyJwt,
  validateBody(addMemberSchema),
  addMember
);

export default router;
