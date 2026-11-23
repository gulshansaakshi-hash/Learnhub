import Course from '../models/Course.js';
import Attempt from '../models/Attempt.js';
import { asyncHandler } from '../middleware/error.js';

// GET /api/analytics/instructor — computed by MongoDB aggregation pipelines
export const instructorAnalytics = asyncHandler(async (req, res) => {
  const instructorId = req.user._id;

  // Per course: enrolments, average progress, attempts, average quiz score.
  const perCourse = await Course.aggregate([
    { $match: { instructor: instructorId } },
    { $lookup: { from: 'enrollments', localField: '_id', foreignField: 'course', as: 'enrollments' } },
    { $lookup: { from: 'attempts', localField: '_id', foreignField: 'course', as: 'attempts' } },
    {
      $project: {
        title: 1,
        status: 1,
        enrollments: { $size: '$enrollments' },
        avgProgress: { $round: [{ $ifNull: [{ $avg: '$enrollments.progress' }, 0] }, 1] },
        attempts: { $size: '$attempts' },
        avgQuizScore: { $round: [{ $ifNull: [{ $avg: '$attempts.percentage' }, 0] }, 1] },
      },
    },
    { $sort: { enrollments: -1, title: 1 } },
  ]);

  // Per quiz: attempts, average score, pass rate.
  const courseIds = perCourse.map((c) => c._id);
  const perQuiz = await Attempt.aggregate([
    { $match: { course: { $in: courseIds } } },
    {
      $group: {
        _id: '$quiz',
        course: { $first: '$course' },
        attempts: { $sum: 1 },
        avgScore: { $avg: '$percentage' },
        passCount: { $sum: { $cond: ['$passed', 1, 0] } },
      },
    },
    { $lookup: { from: 'quizzes', localField: '_id', foreignField: '_id', as: 'quiz' } },
    { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseDoc' } },
    { $unwind: '$quiz' },
    { $unwind: '$courseDoc' },
    {
      $project: {
        _id: 0,
        quizId: '$_id',
        quizTitle: '$quiz.title',
        courseId: '$course',
        courseTitle: '$courseDoc.title',
        passMark: '$quiz.passMark',
        attempts: 1,
        avgScore: { $round: ['$avgScore', 1] },
        passCount: 1,
        passRate: { $round: [{ $multiply: [{ $divide: ['$passCount', '$attempts'] }, 100] }, 1] },
      },
    },
    { $sort: { attempts: -1, quizTitle: 1 } },
  ]);

  // Totals (average quiz score weighted by attempts).
  const totalAttempts = perCourse.reduce((s, c) => s + c.attempts, 0);
  const weighted = perCourse.reduce((s, c) => s + c.avgQuizScore * c.attempts, 0);
  const totals = {
    courses: perCourse.length,
    enrollments: perCourse.reduce((s, c) => s + c.enrollments, 0),
    attempts: totalAttempts,
    avgQuizScore: totalAttempts ? Math.round((weighted / totalAttempts) * 10) / 10 : 0,
  };

  res.json({ totals, perCourse, perQuiz });
});
