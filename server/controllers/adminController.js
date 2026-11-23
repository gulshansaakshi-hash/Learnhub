import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Attempt from '../models/Attempt.js';
import { ApiError, asyncHandler } from '../middleware/error.js';

const ROLES = ['admin', 'instructor', 'student'];
const STATUSES = ['pending', 'approved', 'blocked'];

const countBy = async (Model, field, keys) => {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => { out[r._id] = r.count; });
  out.total = rows.reduce((s, r) => s + r.count, 0);
  return out;
};

// GET /api/admin/stats
export const stats = asyncHandler(async (req, res) => {
  const [users, courses, enrollments, attempts] = await Promise.all([
    countBy(User, 'role', ROLES),
    countBy(Course, 'status', STATUSES),
    Enrollment.countDocuments(),
    Attempt.countDocuments(),
  ]);
  res.json({ stats: { users, courses, enrollments, attempts } });
});

// GET /api/admin/courses?status=
export const listCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw new ApiError(400, 'Invalid status filter');
    filter.status = req.query.status;
  }
  const courses = await Course.find(filter).populate('instructor', 'name email').sort({ createdAt: -1 });
  res.json({ courses: courses.map((c) => ({ ...c.toJSON(), lessonCount: c.lessonCount() })) });
});

// PATCH /api/admin/courses/:id/status
export const setCourseStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) throw new ApiError(400, 'Status must be approved, blocked or pending');
  const course = await Course.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!course) throw new ApiError(404, 'Course not found');
  res.json({ course });
});

// GET /api/admin/users?role=
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) {
    if (!ROLES.includes(req.query.role)) throw new ApiError(400, 'Invalid role filter');
    filter.role = req.query.role;
  }
  const users = await User.find(filter).sort({ role: 1, name: 1 });
  res.json({ users });
});

// POST /api/admin/users — create a user with any role
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'instructor' } = req.body || {};
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required');
  if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new ApiError(400, 'An account with that email already exists');
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ user });
});

// PATCH /api/admin/users/:id — { isBlocked?, role? } (not yourself)
export const updateUser = asyncHandler(async (req, res) => {
  const { isBlocked, role } = req.body || {};
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot block yourself or change your own role');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (isBlocked !== undefined) user.isBlocked = Boolean(isBlocked);
  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
    user.role = role;
  }
  await user.save();
  res.json({ user });
});
