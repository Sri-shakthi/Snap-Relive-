import { Router } from 'express';
import { registerGuestController } from '../controllers/users.controller.js';
import { validateRegisterGuest } from '../validation/validation-users.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { value } = validateRegisterGuest(req.body);
    const result = await registerGuestController(value);

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
