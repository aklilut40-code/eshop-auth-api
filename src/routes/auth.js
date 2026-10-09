const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken, hashToken, refreshCookieOptions } = require('../utils/tokens');

exports.registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

exports.loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  return accessToken;
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  // role is ALWAYS set by the server, never taken from the request
  const user = await User.create({ name, email, password: hash, role: 'customer' });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const ok = user && (await bcrypt.compare(req.body.password, user.password));
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = await issueTokens(user, res);
  res.json({ accessToken, user: { id: user.id, name: user.name, role: user.role } });
});

// Rotates the refresh token: old one stops working once a new one is issued
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const user = await User.findById(payload.id);
  if (!user || user.refreshTokenHash !== hashToken(token))
    return res.status(401).json({ error: 'Refresh token revoked' });

  const accessToken = await issueTokens(user, res);
  res.json({ accessToken });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await User.updateOne({ refreshTokenHash: hashToken(token) }, { refreshTokenHash: null });
  }
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined });
  res.sendStatus(204);
});
