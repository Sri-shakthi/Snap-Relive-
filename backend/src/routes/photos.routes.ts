import { Router } from 'express';
import { confirmPhotoController, presignPhotoController } from '../controllers/photos.controller.js';
import { validatePhotoConfirm, validatePhotoPresign } from '../validation/validation-photo.js';

const router = Router();

router.post('/presign', async (req, res, next) => {
  try {
    const { value } = validatePhotoPresign(req.body);
    const result = await presignPhotoController(value);

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
    const { value } = validatePhotoConfirm(req.body);
    const result = await confirmPhotoController(value);

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
