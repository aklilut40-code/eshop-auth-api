const router = require('express').Router();
const c = require('../controllers/auth');
const { validate } = require('../middleware/validate');

router.post('/register', validate(c.registerSchema), c.register);
router.post('/login', validate(c.loginSchema), c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);

module.exports = router;
