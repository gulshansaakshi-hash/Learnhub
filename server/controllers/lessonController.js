import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import Quiz from '../models/Quiz.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { canAccessContent, loadOwnedCourse, recalcProgress } from './helpers.js';

const FIELDS = ['title', 'content', 'videoUrl', 'duration', 'order'];
const pick = (body = {}) =>
  Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// POST /api/courses/:id/modules/:moduleId/lessons
export const addLesson = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) throw new ApiError(404, 'Module not found');

  const lesson = await Lesson.create({
    order: mod.lessons.length + 1,
    ...pick(req.body),
    course: course._id,
  });
  mod.lessons.push(lesson._id);
  await course.save();
  await recalcProgress(course);
  res.status(201).json({ lesson, course });
});

// Loads a lesson together with its course.
async function loadLesson(id) {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw new ApiError(404, 'Lesson not found');
  const course = await Course.findById(lesson.course);
  if (!course) throw new ApiError(404, 'Course not found');
  return { lesson, course };
}

// GET /api/lessons/:id — enrolled students, owner or admin
export const getLesson = asyncHandler(async (req, res) => {
  const { lesson, course } = await loadLesson(req.params.id);
  if (!(await canAccessContent(course, req.user))) {
    throw new ApiError(403, 'Enrol in this course to view its lessons');
  }
  res.json({ lesson });
});

// PUT /api/lessons/:id
export const updateLesson = asyncHandler(async (req, res) => {
  const { lesson } = await loadLesson(req.params.id);
  await loadOwnedCourse(lesson.course, req.user);
  Object.assign(lesson, pick(req.body));
  await lesson.save();
  res.json({ lesson });
});

// DELETE /api/lessons/:id — pulls it from the module and completedLessons, recalculates progress
export const deleteLesson = asyncHandler(async (req, res) => {
  const { lesson } = await loadLesson(req.params.id);
  const course = await loadOwnedCourse(lesson.course, req.user);

  course.modules.forEach((m) => {
    m.lessons = m.lessons.filter((l) => l.toString() !== lesson._id.toString());
  });
  await course.save();
  await lesson.deleteOne();
  await Quiz.updateMany({ lesson: lesson._id }, { $unset: { lesson: 1 } });
  await Enrollment.updateMany({ course: course._id }, { $pull: { completedLessons: lesson._id } });
  await recalcProgress(course);

  res.json({ message: 'Lesson deleted', course });
});
