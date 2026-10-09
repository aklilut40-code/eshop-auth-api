const mongoose = require('mongoose');

exports.validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
  req.body = result.data; // only validated fields; unknown fields (like "role") are stripped
  next();
};

exports.validId = (param = 'id') => (req, res, next) =>
  mongoose.isValidObjectId(req.params[param]) ? next() : res.status(400).json({ error: 'Invalid id' });
