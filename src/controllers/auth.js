const jwt = require('jsonwebtoken');

// Verifies the access token -> 401 if missing/invalid
exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role check -> 403 if logged in but not allowed
exports.authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });
