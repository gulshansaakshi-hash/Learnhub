import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/error.js';

// POST /api/auth/register — always creates a student.
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required');
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new ApiError(400, 'An account with that email already exists');

  const user = await User.create({ name, email, password, role: 'student' });
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');
  if (user.isBlocked) throw new ApiError(403, 'Your account has been blocked');

  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
