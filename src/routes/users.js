const { z } = require('zod');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.roleSchema = z.object({ role: z.enum(['customer', 'seller', 'admin']) });

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -refreshTokenHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await User.find().select('-password -refreshTokenHash'));
});

// Only admins can promote someone to seller/admin
exports.setRole = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role, refreshTokenHash: null }, // force re-login so the new role takes effect
    { new: true }
  ).select('-password -refreshTokenHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

exports.remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't delete yourself" });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.sendStatus(204);
});
