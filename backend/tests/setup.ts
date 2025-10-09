import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.SESSION_SECRET = 'test-session-secret-key';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_sf_license_util';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use database 1 for tests

// Mock external services
jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  },
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
  },
  testDatabaseConnection: jest.fn().mockResolvedValue(true),
  testRedisConnection: jest.fn().mockResolvedValue(true),
  closeDatabaseConnections: jest.fn().mockResolvedValue(undefined),
}));

// Mock notification service
jest.mock('../src/services/NotificationService', () => ({
  notificationService: {
    initialize: jest.fn(),
    shutdown: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

// Mock scheduled jobs
jest.mock('../src/services/ScheduledJobs', () => ({
  scheduledJobs: {
    startAllJobs: jest.fn(),
    shutdown: jest.fn(),
  },
}));

// Mock jsforce for Salesforce integration
jest.mock('jsforce', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    query: jest.fn(),
    sobject: jest.fn(),
    identity: jest.fn(),
    logout: jest.fn(),
  })),
}));

beforeAll(async () => {
  // Global test setup
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Global test cleanup
  console.log('🧹 Cleaning up test environment...');
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});