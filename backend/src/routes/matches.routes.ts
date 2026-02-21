import { Router } from 'express';
import { getMatchesController, refreshMatchesController } from '../controllers/matches.controller.js';
import { validateGetMatches, validateRefreshMatches } from '../validation/validation-match.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { value } = validateGetMatches(req.query);
    const result = await getMatchesController(value);

    return res.status(200).json({
      success: true,
      data: result,
      requestId: req.requestId
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { value } = validateRefreshMatches(req.body);
    const result = await refreshMatchesController(value);

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
