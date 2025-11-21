import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response): void => {
    logger.error('Unhandled error:', error);

    const response: ApiResponse = {
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
        timestamp: new Date(),
    };

    res.status(500).json(response);
};