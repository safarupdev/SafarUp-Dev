const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Welcome to the SafarUp API' });
});

router.use('/auth', authRoutes);

module.exports = router;
