import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Express error handling middleware.
 * Formats errors and avoids exposing sensitive backend details.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Unhandled Error]:', err);

  const isProduction = config.nodeEnv === 'production';
  const status = err.status || 500;
  
  const response: Record<string, any> = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
  };

  // Only append stack trace in development
  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}
