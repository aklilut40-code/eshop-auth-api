exports.notFound = (req, res) => res.status(404).json({ error: 'Route not found' });

exports.errorHandler = (err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
};
