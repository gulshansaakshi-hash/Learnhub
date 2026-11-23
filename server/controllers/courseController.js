import Course from '../models/Course.js';
import User from '../models/User.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { canManage, loadOwnedCourse, recalcProgress } from './helpers.js';

const EDITABLE = ['title', 'description', 'category', 'price', 'thumbnail'];
const pick = (body = {}) =>
  Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/courses?search=&category= — approved catalogue
export const listCourses = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = { status: 'approved' };
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
  }
  const [courses, categories] = await Promise.all([
    Course.find(filter).populate('instructor', 'name').sort({ createdAt: -1 }),
    Course.distinct('category', { status: 'approved' }),
  ]);
  res.json({ courses: courses.map(withCount), categories: categories.sort() });
});

const withCount = (c) => ({ ...c.toJSON(), lessonCount: c.lessonCount() });

// GET /api/courses/mine — instructor's own courses (any status)
export const myCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).sort({ createdAt: -1 });
  res.json({ courses: courses.map(withCount) });
});

// GET /api/courses/:id — detail + outline + quizzes
export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'name email')
    .populate('modules.lessons', 'title duration order');
  if (!course) throw new ApiError(404, 'Course not found');

  const manage = canManage(course, req.user);
  if (course.status !== 'approved' && !manage) throw new ApiError(404, 'Course not found');

  const quizzes = await Quiz.find({ course: course._id }).select('title passMark lesson questions');
  const result = {
    course: { ...course.toJSON(), lessonCount: course.lessonCount() },
    quizzes: quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      passMark: q.passMark,
      lesson: q.lesson,
      questionCount: q.questions.length,
    })),
  };

  if (req.user) {
    result.canManage = manage;
    result.enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id });
  }
  res.json(result);
});

// POST /api/courses — always created as pending
// Admins may assign any instructor/admin as the course owner.
const resolveInstructor = async (id) => {
  const user = await User.findById(id).catch(() => null);
  if (!user || !['instructor', 'admin'].includes(user.role)) throw new ApiError(400, 'Instructor must be an existing instructor or admin');
  return user._id;
};

// POST /api/courses — instructors' courses start pending; admins' are approved
export const createCourse = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const instructor = isAdmin && req.body?.instructor ? await resolveInstructor(req.body.instructor) : req.user._id;
  const course = await Course.create({ ...pick(req.body), instructor, status: isAdmin ? 'approved' : 'pending' });
  res.status(201).json({ course });
});

// PUT /api/courses/:id
export const updateCourse = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  Object.assign(course, pick(req.body));
  if (req.user.role === 'admin' && req.body?.instructor) course.instructor = await resolveInstructor(req.body.instructor);
  await course.save();
  res.json({ course });
});

// DELETE /api/courses/:id — cascades to lessons, quizzes, attempts, enrolments
export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  await Promise.all([
    Lesson.deleteMany({ course: course._id }),
    Quiz.deleteMany({ course: course._id }),
    Attempt.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
  ]);
  await course.deleteOne();
  res.json({ message: 'Course deleted' });
});

// POST /api/courses/:id/modules
export const addModule = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  const title = (req.body?.title || '').trim();
  if (!title) throw new ApiError(400, 'Module title is required');
  const order = req.body.order ?? course.modules.length + 1;
  course.modules.push({ title, order, lessons: [] });
  await course.save();
  res.status(201).json({ course });
});

const findModule = (course, moduleId) => {
  const mod = course.modules.id(moduleId);
  if (!mod) throw new ApiError(404, 'Module not found');
  return mod;
};

// PUT /api/courses/:id/modules/:moduleId — rename or reorder
export const updateModule = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  const mod = findModule(course, req.params.moduleId);
  if (req.body?.title !== undefined) {
    if (!String(req.body.title).trim()) throw new ApiError(400, 'Module title is required');
    mod.title = String(req.body.title).trim();
  }
  if (req.body?.order !== undefined) mod.order = Number(req.body.order);
  course.modules.sort((a, b) => a.order - b.order);
  await course.save();
  res.json({ course });
});

// DELETE /api/courses/:id/modules/:moduleId — also deletes its lessons
export const deleteModule = asyncHandler(async (req, res) => {
  const course = await loadOwnedCourse(req.params.id, req.user);
  const mod = findModule(course, req.params.moduleId);
  const lessonIds = [...mod.lessons];
  mod.deleteOne();
  await course.save();
  if (lessonIds.length) {
    await Lesson.deleteMany({ _id: { $in: lessonIds } });
    await Quiz.updateMany({ lesson: { $in: lessonIds } }, { $unset: { lesson: 1 } });
    await Enrollment.updateMany({ course: course._id }, { $pull: { completedLessons: { $in: lessonIds } } });
    await recalcProgress(course);
  }
  res.json({ course });
});
