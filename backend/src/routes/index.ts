import { Router } from 'express';
import eventsRoutes from './events.routes.js';
import selfiesRoutes from './selfies.routes.js';
import photosRoutes from './photos.routes.js';
import matchesRoutes from './matches.routes.js';
import downloadsRoutes from './downloads.routes.js';

const router = Router();

router.use('/events', eventsRoutes);
router.use('/selfies', selfiesRoutes);
router.use('/photos', photosRoutes);
router.use('/matches', matchesRoutes);
router.use('/downloads', downloadsRoutes);

export default router;
