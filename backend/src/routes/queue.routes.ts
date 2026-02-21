import { Router } from 'express';
import { getQueueStatusController } from '../controllers/queue.controller.js';

const router = Router();

router.get('/status', async (req, res, next) => {
  try {
    const result = await getQueueStatusController();
    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
