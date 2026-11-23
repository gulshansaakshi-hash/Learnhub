import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { canAccessContent, canManage, courseHasLesson, loadOwnedCourse } from './helpers.js';

// Validates and normalises the questions array.
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new ApiError(400, 'A quiz needs at least 1 question');
  }
  return questions.map((q, i) => {
    const n = i + 1;
    const question = String(q?.question || '').trim();
    if (!question) throw new ApiError(400, `Question ${n} needs text`);
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o ?? '').trim()) : [];
    if (options.length < 2 || options.some((o) => !o)) {
      throw new ApiError(400, `Question ${n} needs at least 2 non-empty options`);
    }
    const correctIndex = Number(q.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw new ApiError(400, `Question ${n} has an invalid correct answer`);
    }
    return { question, options, correctIndex };
  });
}

function validatePassMark(passMark) {
  if (passMark === undefined || passMark === null || passMark === '') return 50;
  const n = Number(passMark);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new ApiError(400, 'Pass mark must be between 0 and 100');
  return n;
}

function validateLesson(course, lesson) {
  if (!lesson) return undefined;
  if (!mongoose.isValidObjectId(lesson) || !courseHasLesson(course, lesson)) {
    throw new ApiError(400, 'That lesson does not belong to this course');
  }
  return lesson;
}

async function loadQuiz(id) {
  const quiz = await Quiz.findById(id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const course = await Course.findById(quiz.course);
  if (!course) throw new ApiError(404, 'Course not found');
  return { quiz, course };
}

// Removes correct answers for students.
const publicQuiz = (quiz) => {
  const q = quiz.toJSON();
  q.questions = q.questions.map(({ correctIndex, ...rest }) => rest); // eslint-disable-line no-unused-vars
  return q;
};

// POST /api/quizzes
export const createQuiz = asyncHandler(async (req, res) => {
  const { course: courseId, lesson, title, passMark, questions } = req.body || {};
  if (!courseId) throw new ApiError(400, 'Course is required');
  const course = await loadOwnedCourse(courseId, req.user);
  if (!String(title || '').trim()) throw new ApiError(400, 'Quiz title is required');

  const quiz = await Quiz.create({
    course: course._id,
    lesson: validateLesson(course, lesson),
    title: String(title).trim(),
    passMark: validatePassMark(passMark),
    questions: validateQuestions(questions),
  });
  res.status(201).json({ quiz });
});

// GET /api/quizzes/:id — correct answers hidden unless you can manage the course
export const getQuiz = asyncHandler(async (req, res) => {
  const { quiz, course } = await loadQuiz(req.params.id);
  if (!(await canAccessContent(course, req.user))) throw new ApiError(403, 'Enrol in this course to take its quizzes');
  const manage = canManage(course, req.user);
  res.json({
    quiz: manage ? quiz : publicQuiz(quiz),
    course: { _id: course._id, title: course.title },
    canManage: manage,
  });
});

// PUT /api/quizzes/:id
export const updateQuiz = asyncHandler(async (req, res) => {
  const { quiz } = await loadQuiz(req.params.id);
  const course = await loadOwnedCourse(quiz.course, req.user);
  const { title, passMark, questions, lesson } = req.body || {};

  if (title !== undefined) {
    if (!String(title).trim()) throw new ApiError(400, 'Quiz title is required');
    quiz.title = String(title).trim();
  }
  if (passMark !== undefined) quiz.passMark = validatePassMark(passMark);
  if (questions !== undefined) quiz.questions = validateQuestions(questions);
  if (lesson !== undefined) quiz.lesson = validateLesson(course, lesson) || undefined;

  await quiz.save();
  res.json({ quiz });
});

// DELETE /api/quizzes/:id — also deletes its attempts
export const deleteQuiz = asyncHandler(async (req, res) => {
  const { quiz } = await loadQuiz(req.params.id);
  await loadOwnedCourse(quiz.course, req.user);
  await Attempt.deleteMany({ quiz: quiz._id });
  await quiz.deleteOne();
  res.json({ message: 'Quiz deleted' });
});

// POST /api/quizzes/:id/attempt — graded on the server
export const submitAttempt = asyncHandler(async (req, res) => {
  const { quiz, course } = await loadQuiz(req.params.id);
  const enrolled = await Enrollment.exists({ student: req.user._id, course: course._id });
  if (!enrolled) throw new ApiError(403, 'Enrol in this course to take its quizzes');

  const raw = req.body?.answers;
  if (!Array.isArray(raw)) throw new ApiError(400, 'Answers must be an array of option indexes');

  const answers = quiz.questions.map((_, i) => {
    const a = Number(raw[i]);
    return Number.isInteger(a) ? a : -1; // -1 = unanswered
  });
  const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0);
  const total = quiz.questions.length;
  const percentage = total ? Math.round((score / total) * 100) : 0;

  const attempt = await Attempt.create({
    student: req.user._id,
    quiz: quiz._id,
    course: course._id,
    answers,
    score,
    total,
    percentage,
    passed: percentage >= quiz.passMark,
  });

  const review = quiz.questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    chosenIndex: answers[i],
    correctIndex: q.correctIndex,
    correct: answers[i] === q.correctIndex,
  }));

  res.status(201).json({ attempt, review, passMark: quiz.passMark });
});

// GET /api/quizzes/:id/attempts/me
export const myAttempts = asyncHandler(async (req, res) => {
  const attempts = await Attempt.find({ quiz: req.params.id, student: req.user._id }).sort({ createdAt: -1 });
  res.json({ attempts });
});
