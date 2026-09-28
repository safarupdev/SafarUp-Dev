const { Router } = require('express');

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Welcome to the Sakala API' });
});

module.exports = router;
