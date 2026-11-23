import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../middleware/error.js';

const idOf = (v) => (v && v._id ? v._id.toString() : v?.toString());

// True when the user is the course's instructor.
export const isOwner = (course, user) => !!user && idOf(course.instructor) === idOf(user._id);

// True when the user may manage the course (owner or admin).
export const canManage = (course, user) => !!user && (user.role === 'admin' || isOwner(course, user));

// Loads a course and checks the requester owns it (or is an admin). 404 / 403 otherwise.
export async function loadOwnedCourse(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (!canManage(course, user)) throw new ApiError(403, 'Only the course instructor or an admin can do this');
  return course;
}

// Lesson content and quizzes: enrolled students, the instructor or an admin.
export async function canAccessContent(course, user) {
  if (!user) return false;
  if (canManage(course, user)) return true;
  if (user.role !== 'student') return false;
  const enrolled = await Enrollment.exists({ student: user._id, course: course._id });
  return !!enrolled;
}

export const calcProgress = (completedCount, totalLessons) =>
  totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

// Recalculates progress for every enrolment of a course (after lessons are added or removed).
export async function recalcProgress(course) {
  const total = course.lessonCount();
  const enrollments = await Enrollment.find({ course: course._id });
  await Promise.all(
    enrollments.map((e) => {
      e.progress = calcProgress(e.completedLessons.length, total);
      return e.save();
    })
  );
}

// Is this lesson id part of the course outline?
export const courseHasLesson = (course, lessonId) =>
  course.modules.some((m) => m.lessons.some((l) => l.toString() === lessonId.toString()));
