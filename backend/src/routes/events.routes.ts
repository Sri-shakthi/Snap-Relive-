import { Router } from 'express';
import { createEventController } from '../controllers/events.controller.js';
import { validateCreateEvent } from '../validation/validation-events.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { value } = validateCreateEvent(req.body);
    const result = await createEventController(value);

    return res.status(201).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
