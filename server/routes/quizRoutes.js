import { Router } from 'express';
import {
  createQuiz, deleteQuiz, getQuiz, myAttempts, submitAttempt, updateQuiz,
} from '../controllers/quizController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
const manager = [protect, authorize('instructor', 'admin')];

router.post('/', ...manager, createQuiz);
router.get('/:id', protect, getQuiz);
router.put('/:id', ...manager, updateQuiz);
router.delete('/:id', ...manager, deleteQuiz);
router.post('/:id/attempt', protect, authorize('student'), submitAttempt);
router.get('/:id/attempts/me', protect, authorize('student'), myAttempts);
export default router;
