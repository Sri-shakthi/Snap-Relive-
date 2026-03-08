import { Router } from 'express';
import {
  abortVideoMultipartUploadController,
  completeVideoMultipartUploadController,
  getVideoMultipartPartUrlController,
  initVideoMultipartUploadController
} from '../controllers/videos.controller.js';
import {
  validateVideoMultipartAbort,
  validateVideoMultipartComplete,
  validateVideoMultipartInit,
  validateVideoMultipartPartUrl
} from '../validation/validation-videos.js';

const router = Router();

router.post('/multipart/init', async (req, res, next) => {
  try {
    const { value } = validateVideoMultipartInit(req.body);
    const result = await initVideoMultipartUploadController(value);
    return res.status(200).json({ success: true, data: result, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
});

router.post('/multipart/part-url', async (req, res, next) => {
  try {
    const { value } = validateVideoMultipartPartUrl(req.body);
    const result = await getVideoMultipartPartUrlController(value);
    return res.status(200).json({ success: true, data: result, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
});

router.post('/multipart/complete', async (req, res, next) => {
  try {
    const { value } = validateVideoMultipartComplete(req.body);
    const result = await completeVideoMultipartUploadController(value);
    return res.status(202).json({ success: true, data: result, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
});

router.post('/multipart/abort', async (req, res, next) => {
  try {
    const { value } = validateVideoMultipartAbort(req.body);
    const result = await abortVideoMultipartUploadController(value);
    return res.status(200).json({ success: true, data: result, requestId: req.requestId });
  } catch (error) {
    return next(error);
  }
});

export default router;
