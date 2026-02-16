import { Router } from 'express';
import {
  confirmSelfieController,
  presignSelfieController
} from '../controllers/selfies.controller.js';
import { validateSelfieConfirm, validateSelfiePresign } from '../validation/validation-selfie.js';

const router = Router();

router.post('/presign', async (req, res, next) => {
  try {
    const { value } = validateSelfiePresign(req.body);
    const result = await presignSelfieController(value);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const { value } = validateSelfieConfirm(req.body);
    const result = await confirmSelfieController(value);

    return res.status(202).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
