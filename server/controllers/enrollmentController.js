import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { calcProgress, courseHasLesson } from './helpers.js';

// GET /api/enrollments/me
export const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({ path: 'course', populate: { path: 'instructor', select: 'name' } })
    .sort({ updatedAt: -1 });
  // Skip enrolments whose course has since been deleted.
  res.json({ enrollments: enrollments.filter((e) => e.course) });
});

// POST /api/enrollments/:courseId
export const enroll = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course || course.status !== 'approved') throw new ApiError(404, 'Course not found or not available');

  const existing = await Enrollment.findOne({ student: req.user._id, course: course._id });
  if (existing) throw new ApiError(400, 'You are already enrolled in this course');

  const enrollment = await Enrollment.create({ student: req.user._id, course: course._id, progress: 0 });
  res.status(201).json({ enrollment });
});

// POST /api/enrollments/:courseId/complete/:lessonId
export const completeLesson = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  const enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id });
  if (!enrollment) throw new ApiError(403, 'You are not enrolled in this course');
  if (!courseHasLesson(course, lessonId)) throw new ApiError(400, 'That lesson does not belong to this course');

  const already = enrollment.completedLessons.some((l) => l.toString() === lessonId);
  if (!already) enrollment.completedLessons.push(lessonId);
  enrollment.progress = calcProgress(enrollment.completedLessons.length, course.lessonCount());
  await enrollment.save();

  res.json({ enrollment, progress: enrollment.progress });
});
