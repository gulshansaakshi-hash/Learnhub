import { Router } from 'express';
import { completeLesson, enroll, myEnrollments } from '../controllers/enrollmentController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('student'));
router.get('/me', myEnrollments);
router.post('/:courseId', enroll);
router.post('/:courseId/complete/:lessonId', completeLesson);
export default router;
