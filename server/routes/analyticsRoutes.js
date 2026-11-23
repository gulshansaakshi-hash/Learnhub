import { Router } from 'express';
import { instructorAnalytics } from '../controllers/analyticsController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.get('/instructor', protect, authorize('instructor'), instructorAnalytics);
export default router;
