import { Request, Response } from 'express';
import os from 'os';
import { logger } from '../utils/logger'

export const health = (_req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    res.status(200).json({
      success: true,
      data: {
        uptime,
        message: 'ok',
        timestamp: Date.now(),
        hostname: os.hostname(),
      },
    });
  } catch (err) {
    logger?.error?.('Health check error', err);
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
};