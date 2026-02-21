import { Router } from 'express';
import {
  createDownloadController,
  createDownloadLinksController,
  getDownloadController
} from '../controllers/downloads.controller.js';
import {
  validateCreateDownload,
  validateCreateDownloadLinks,
  validateGetDownload
} from '../validation/validation-download.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { value } = validateCreateDownload(req.body);
    const result = await createDownloadController(value);

    return res.status(202).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/links', async (req, res, next) => {
  try {
    const { value } = validateCreateDownloadLinks(req.body);
    const result = await createDownloadLinksController(value);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:downloadId', async (req, res, next) => {
  try {
    const { value } = validateGetDownload({
      downloadId: req.params.downloadId,
      userId: req.query.userId
    });

    const result = await getDownloadController(value);

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
