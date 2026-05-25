import { Router } from 'express';
import {
  addMember,
  addMemberSchema,
  getAnalytics,
  getMembers,
  getMyOrgHandler,
  getOrgNameHandler,
  optInSchema,
  updateOptInHandler,
} from '../controllers/organizationController.js';
import { verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/analytics', verifyJwt, getAnalytics);

router.get('/my-org', verifyJwt, getMyOrgHandler);

router.get('/org-name', verifyJwt, getOrgNameHandler);

router.patch('/my-org/opt-in', verifyJwt, validateBody(optInSchema), updateOptInHandler);

router.get('/members', verifyJwt, getMembers);

router.post('/members', verifyJwt, validateBody(addMemberSchema), addMember);

export default router;
