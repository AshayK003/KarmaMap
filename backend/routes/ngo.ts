import { Router } from 'express';
import { updateUpi, updateUpiSchema } from '../controllers/ngoController.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.patch('/upi', verifyJwt, requireRole('ngo'), validateBody(updateUpiSchema), updateUpi);

export default router;
