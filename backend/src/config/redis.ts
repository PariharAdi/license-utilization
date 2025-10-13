import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
    try {
        // Skip Redis if URL not provided or if it's a local instance without auth
        if (!process.env.REDIS_URL || process.env.REDIS_URL === 'redis://localhost:6379') {
            logger.info('⚠️ Redis URL not configured or local instance detected, skipping Redis connection');
            logger.info('Continuing without Redis - job queues will use in-memory fallback');
            return;
        }

        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 500)
            }
        });

        redisClient.on('error', (err: Error) => {
            logger.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('✅ Redis connected successfully');
        });

        redisClient.on('disconnect', () => {
            logger.warn('⚠️ Redis disconnected');
        });

        await redisClient.connect();
        logger.info('Redis connection established');
    } catch (error) {
        logger.error('❌ Redis connection failed:', error);
        logger.info('Continuing without Redis - job queues will use in-memory fallback');
        redisClient = null;
    }
};

export const disconnectRedis = async (): Promise<void> => {
    try {
        if (redisClient) {
            await redisClient.disconnect();
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error disconnecting Redis:', error);
    }
};

export { redisClient };