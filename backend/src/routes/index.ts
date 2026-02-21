import { Router } from 'express';
import eventsRoutes from './events.routes.js';
import selfiesRoutes from './selfies.routes.js';
import photosRoutes from './photos.routes.js';
import matchesRoutes from './matches.routes.js';
import downloadsRoutes from './downloads.routes.js';
import queueRoutes from './queue.routes.js';

const router = Router();

router.use('/events', eventsRoutes);
router.use('/selfies', selfiesRoutes);
router.use('/photos', photosRoutes);
router.use('/matches', matchesRoutes);
router.use('/downloads', downloadsRoutes);
router.use('/queue', queueRoutes);

export default router;
