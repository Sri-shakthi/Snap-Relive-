import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import Joi from 'joi';
import { config } from '../config/index.js';
import { AppError, isAppError } from '../utils/errors.js';

const isAwsError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorRecord = error as Record<string, unknown>;
  const errorName = typeof errorRecord.name === 'string' ? errorRecord.name : '';

  return Boolean(
    '$$metadata' in errorRecord || errorName.includes('Exception')
  );
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    requestId: req.requestId
  });
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error('Unhandled request error', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error
  });

  if (isAppError(error)) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      requestId: req.requestId
    });
  }

  if (error instanceof Joi.ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        details: error.details
      },
      requestId: req.requestId
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource conflict',
          details: error.meta
        },
        requestId: req.requestId
      });
    }

    if (error.code === 'P2021') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database table not found. Run Prisma migrations.',
          details: error.meta
        },
        requestId: req.requestId
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: error.meta
        },
        requestId: req.requestId
      });
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Database initialization failed',
        details: config.app.isProduction ? undefined : error.message
      },
      requestId: req.requestId
    });
  }

  if (isAwsError(error)) {
    return res.status(502).json({
      success: false,
      error: {
        code: 'AWS_ERROR',
        message: 'AWS service error'
      },
      requestId: req.requestId
    });
  }

  const fallbackError = new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
  return res.status(500).json({
    success: false,
    error: {
      code: fallbackError.code,
      message: fallbackError.message
    },
    requestId: req.requestId
  });
};
