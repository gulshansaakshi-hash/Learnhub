import { Router } from 'express';
import {
  createUser, listCourses, listUsers, setCourseStatus, stats, updateUser,
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin'));
router.get('/stats', stats);
router.get('/courses', listCourses);
router.patch('/courses/:id/status', setCourseStatus);
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
export default router;
