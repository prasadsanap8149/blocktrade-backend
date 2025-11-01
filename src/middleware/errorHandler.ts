import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  timestamp: string;
  path?: string;
  stack?: string;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly isOperational: boolean;

  constructor(message: string, status: number = 500, isOperational: boolean = true) {
    super(message);
    this.status = status;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = error instanceof AppError ? error.status : 500;
  const isOperational = error instanceof AppError ? error.isOperational : false;

  const errorResponse: ErrorResponse = {
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
    status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Log error
  if (isOperational) {
    logger.warn(`Operational Error: ${error.message}`, {
      status,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.error(`System Error: ${error.message}`, {
      status,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: error.stack,
    });
  }

  res.status(status).json(errorResponse);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};
