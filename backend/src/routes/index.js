/**
 * API router — mounts every domain router under /api (PRD §102).
 *
 * Phase 2 mounts the content-foundation routers:
 *   public  /api/destinations  /api/districts  /api/categories  /api/places
 *   admin   /api/admin/destinations  /api/admin/districts  …
 *
 * Auth is mounted first and is left untouched by Phase 2.
 */

const { Router } = require('express');

const authRoutes = require('./auth.routes');
const destinationRoutes = require('./destination.routes');
const taxonomyRoutes = require('./taxonomy.routes');

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Welcome to the SafarUp API' });
});

router.use('/auth', authRoutes);

// Public discovery surfaces. Anonymous access is permitted; the services
// restrict every read to PUBLISHED content (PRD §63).
router.use('/destinations', destinationRoutes.publicRouter);
router.use('/districts', taxonomyRoutes.district.publicRouter);
router.use('/categories', taxonomyRoutes.category.publicRouter);
router.use('/places', taxonomyRoutes.place.publicRouter);

// Admin management surfaces. Authentication + role enforcement is applied
// inside each router via `authenticate` and `authorize`.
router.use('/admin', destinationRoutes.adminRouter);
router.use('/admin', taxonomyRoutes.district.adminRouter);
router.use('/admin', taxonomyRoutes.category.adminRouter);
router.use('/admin', taxonomyRoutes.place.adminRouter);

module.exports = router;
