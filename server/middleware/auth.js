import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './error.js';

export const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const readToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const userFromToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'User no longer exists');
  if (user.isBlocked) throw new ApiError(403, 'Your account has been blocked');
  return user;
};

// Requires a valid token from a non-blocked user.
export const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'Not authorised, no token');
  req.user = await userFromToken(token);
  next();
});

// Attaches req.user when a valid token is present; otherwise continues as a guest.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await userFromToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
});

// Restricts a route to the given roles (use after protect).
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to do this'));
  }
  next();
};
