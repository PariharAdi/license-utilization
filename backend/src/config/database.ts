import { Pool } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!process.env.DATABASE_URL) {
      logger.info('Database URL not provided, skipping database connection');
      return;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    await pool.connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.warn('⚠️ Database connection failed, continuing without database:', error);
    pool = null;
    // Don't exit process, database is optional for Salesforce-only mode
  }
};

export { pool };