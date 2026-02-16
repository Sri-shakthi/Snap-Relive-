import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const apiRateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests'
      },
      requestId: req.requestId
    });
  }
});
