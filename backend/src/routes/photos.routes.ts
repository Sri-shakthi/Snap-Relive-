import { Router } from 'express';
import { confirmPhotoController, downloadPhotoController, presignPhotoController } from '../controllers/photos.controller.js';
import { validatePhotoConfirm, validatePhotoDownload, validatePhotoPresign } from '../validation/validation-photo.js';

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

router.get('/:photoId/download', async (req, res, next) => {
  try {
    const { value } = validatePhotoDownload({
      photoId: req.params.photoId,
      userId: req.query.userId,
      eventId: req.query.eventId
    });
    const result = await downloadPhotoController(value);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=60');

    return res.status(200).send(result.fileBuffer);
  } catch (error) {
    return next(error);
  }
});

export default router;
