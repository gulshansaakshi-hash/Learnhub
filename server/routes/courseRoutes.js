import { Router } from 'express';
import {
  addModule, createCourse, deleteCourse, deleteModule, getCourse,
  listCourses, myCourses, updateCourse, updateModule,
} from '../controllers/courseController.js';
import { addLesson } from '../controllers/lessonController.js';
import { authorize, optionalAuth, protect } from '../middleware/auth.js';

const router = Router();
const manager = [protect, authorize('instructor', 'admin')];

router.get('/', listCourses);
router.get('/mine', protect, authorize('instructor'), myCourses);
router.get('/:id', optionalAuth, getCourse);
router.post('/', ...manager, createCourse);
router.put('/:id', ...manager, updateCourse);
router.delete('/:id', ...manager, deleteCourse);

router.post('/:id/modules', ...manager, addModule);
router.put('/:id/modules/:moduleId', ...manager, updateModule);
router.delete('/:id/modules/:moduleId', ...manager, deleteModule);
router.post('/:id/modules/:moduleId/lessons', ...manager, addLesson);

export default router;
