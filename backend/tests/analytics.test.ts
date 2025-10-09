import request from 'supertest';
import express from 'express';
import { AnalyticsController } from '../src/controllers/AnalyticsController';
import { pool } from '../src/config/database';

// Create test app
const app = express();
app.use(express.json());

// Mock middleware for authentication
app.use((req: any, res, next) => {
  req.organization = {
    id: 'test-org-id',
    orgName: 'Test Organization',
    salesforceOrgId: '00D000000000001',
  };
  next();
});

// Add routes
app.get('/analytics/overview', AnalyticsController.getOverview);
app.get('/analytics/trends', AnalyticsController.getTrendAnalysis);
app.get('/analytics/patterns', AnalyticsController.getUsagePatterns);
app.get('/analytics/recommendations', AnalyticsController.getOptimizationRecommendations);

const mockPool = pool as jest.Mocked<typeof pool>;

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /analytics/overview', () => {
    it('should return organization overview with user counts and license data', async () => {
      // Mock database responses
      const mockUserCounts = {
        rows: [{ total_users: '100', active_users: '85', inactive_users: '15' }]
      };

      const mockLicenses = {
        rows: [
          { license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, utilization_percent: 90 },
          { license_type: 'Platform', total_licenses: 25, used_licenses: 20, utilization_percent: 80 }
        ]
      };

      const mockTopObjects = {
        rows: [
          { object_name: 'Account', usage: '500' },
          { object_name: 'Contact', usage: '300' }
        ]
      };

      const mockActivityTrends = {
        rows: [
          {
            activity_date: '2024-01-15',
            logins: '25',
            api_requests: '150',
            reports: '10',
            dashboards: '5',
            active_users: '20'
          }
        ]
      };

      const mockUsageLevels = {
        rows: [
          { usage_level: 'Heavy', user_count: '10' },
          { usage_level: 'Medium', user_count: '25' },
          { usage_level: 'Light', user_count: '30' },
          { usage_level: 'Inactive', user_count: '20' }
        ]
      };

      mockPool.query
        .mockResolvedValueOnce(mockUserCounts)
        .mockResolvedValueOnce(mockLicenses)
        .mockResolvedValueOnce(mockTopObjects)
        .mockResolvedValueOnce(mockActivityTrends)
        .mockResolvedValueOnce(mockUsageLevels);

      const response = await request(app)
        .get('/analytics/overview')
        .query({ dateRange: '30' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers', 100);
      expect(response.body.data).toHaveProperty('activeUsers', 85);
      expect(response.body.data).toHaveProperty('inactiveUsers', 15);
      expect(response.body.data).toHaveProperty('licenseUtilization');
      expect(response.body.data).toHaveProperty('topObjects');
      expect(response.body.data).toHaveProperty('activityTrends');
      expect(response.body.data.heavyUsers).toBe(10);
      expect(response.body.data.mediumUsers).toBe(25);

      // Verify database queries were called
      expect(mockPool.query).toHaveBeenCalledTimes(5);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/analytics/overview')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve analytics overview');
    });
  });

  describe('GET /analytics/trends', () => {
    it('should return trend analysis with predictions', async () => {
      const mockTrendsData = {
        rows: [
          {
            activity_date: '2024-01-10',
            active_users: 20,
            total_logins: 100,
            total_api_requests: 500,
            total_reports: 25,
            total_dashboards: 15,
            avg_activity_per_user: 25.5,
            prev_active_users: 18,
            prev_logins: 95
          },
          {
            activity_date: '2024-01-11',
            active_users: 22,
            total_logins: 110,
            total_api_requests: 550,
            total_reports: 30,
            total_dashboards: 18,
            avg_activity_per_user: 27.2,
            prev_active_users: 20,
            prev_logins: 100
          },
          {
            activity_date: '2024-01-12',
            active_users: 25,
            total_logins: 125,
            total_api_requests: 600,
            total_reports: 35,
            total_dashboards: 20,
            avg_activity_per_user: 30.0,
            prev_active_users: 22,
            prev_logins: 110
          }
        ]
      };

      mockPool.query.mockResolvedValue(mockTrendsData);

      const response = await request(app)
        .get('/analytics/trends')
        .query({ dateRange: '30' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('historical');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('summary');

      const historical = response.body.data.historical;
      expect(historical).toHaveLength(3);
      expect(historical[0]).toHaveProperty('activeUsersGrowth');
      expect(historical[0]).toHaveProperty('loginsGrowth');

      const predictions = response.body.data.predictions;
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0]).toHaveProperty('date');
      expect(predictions[0]).toHaveProperty('predicted');
      expect(predictions[0]).toHaveProperty('confidence');
    });
  });

  describe('GET /analytics/patterns', () => {
    it('should return usage patterns including daily and hourly patterns', async () => {
      const mockPatterns = {
        rows: [
          { day_of_week: 1, hour_of_day: 9, logins: '50', api_requests: '200', active_users: '15' },
          { day_of_week: 1, hour_of_day: 14, logins: '75', api_requests: '300', active_users: '20' },
          { day_of_week: 5, hour_of_day: 16, logins: '25', api_requests: '100', active_users: '10' }
        ]
      };

      const mockSegmentation = {
        rows: [
          {
            user_segment: 'Power User',
            license_type: 'Salesforce',
            user_count: '5',
            avg_logins: '50.5',
            avg_api_requests: '200.2',
            avg_active_days: '20'
          }
        ]
      };

      const mockObjectPatterns = {
        rows: [
          {
            object_name: 'Account',
            total_usage: '1000',
            avg_unique_users: '25.5',
            total_creates: '100',
            total_reads: '700',
            total_updates: '150',
            total_deletes: '50',
            read_percentage: '70.00'
          }
        ]
      };

      mockPool.query
        .mockResolvedValueOnce(mockPatterns)
        .mockResolvedValueOnce(mockSegmentation)
        .mockResolvedValueOnce(mockObjectPatterns);

      const response = await request(app)
        .get('/analytics/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyPatterns');
      expect(response.body.data).toHaveProperty('hourlyPatterns');
      expect(response.body.data).toHaveProperty('userSegmentation');
      expect(response.body.data).toHaveProperty('objectPatterns');

      const dailyPatterns = response.body.data.dailyPatterns;
      expect(dailyPatterns).toHaveLength(7); // 7 days of week
      expect(dailyPatterns[0]).toHaveProperty('day');
      expect(dailyPatterns[0]).toHaveProperty('totalLogins');

      const hourlyPatterns = response.body.data.hourlyPatterns;
      expect(hourlyPatterns).toHaveLength(24); // 24 hours
      expect(hourlyPatterns[0]).toHaveProperty('hour');
      expect(hourlyPatterns[0]).toHaveProperty('totalLogins');

      const userSegmentation = response.body.data.userSegmentation;
      expect(userSegmentation[0]).toHaveProperty('segment', 'Power User');
      expect(userSegmentation[0]).toHaveProperty('userCount', 5);

      const objectPatterns = response.body.data.objectPatterns;
      expect(objectPatterns[0]).toHaveProperty('objectName', 'Account');
      expect(objectPatterns[0]).toHaveProperty('readPercentage', 70);
    });
  });

  describe('GET /analytics/recommendations', () => {
    it('should return optimization recommendations with prioritization', async () => {
      const mockInactiveUsers = {
        rows: [
          {
            id: 'user1',
            username: 'inactive.user@test.com',
            email: 'inactive.user@test.com',
            license_type: 'Salesforce',
            last_login: '2024-01-01',
            total_activity: '2'
          }
        ]
      };

      const mockUnderutilizedObjects = {
        rows: [
          {
            object_name: 'CustomObject__c',
            total_usage: '5',
            avg_users: '1.2'
          }
        ]
      };

      const mockLicenseAnalysis = {
        rows: [
          {
            license_type: 'Salesforce',
            total_licenses: 50,
            used_licenses: 45,
            unused_licenses: 5,
            utilization_percent: 90
          },
          {
            license_type: 'Platform',
            total_licenses: 20,
            used_licenses: 8,
            unused_licenses: 12,
            utilization_percent: 40
          }
        ]
      };

      mockPool.query
        .mockResolvedValueOnce(mockInactiveUsers)
        .mockResolvedValueOnce(mockUnderutilizedObjects)
        .mockResolvedValueOnce(mockLicenseAnalysis);

      const response = await request(app)
        .get('/analytics/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('details');

      const recommendations = response.body.data.recommendations;
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Check for license optimization recommendation
      const licenseRec = recommendations.find(r => r.type === 'license_optimization');
      expect(licenseRec).toBeDefined();
      expect(licenseRec.priority).toBe('high'); // 12 unused Platform licenses
      expect(licenseRec.affectedCount).toBe(12);

      // Check for inactive users recommendation
      const inactiveRec = recommendations.find(r => r.type === 'inactive_users');
      expect(inactiveRec).toBeDefined();
      expect(inactiveRec.priority).toBe('high');

      // Check summary
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('totalRecommendations');
      expect(summary).toHaveProperty('highPriority');
      expect(summary.highPriority).toBeGreaterThan(0);

      // Check details
      const details = response.body.data.details;
      expect(details).toHaveProperty('inactiveUsers');
      expect(details.inactiveUsers[0]).toHaveProperty('username', 'inactive.user@test.com');
    });

    it('should handle cases with no recommendations', async () => {
      // Mock empty results
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No inactive users
        .mockResolvedValueOnce({ rows: [] }) // No underutilized objects
        .mockResolvedValueOnce({ rows: [] }); // No licenses

      const response = await request(app)
        .get('/analytics/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toHaveLength(0);
      expect(response.body.data.summary.totalRecommendations).toBe(0);
    });
  });

  describe('Input validation', () => {
    it('should handle invalid date range parameters', async () => {
      mockPool.query.mockRejectedValue(new Error('Invalid date'));

      const response = await request(app)
        .get('/analytics/overview')
        .query({ dateRange: 'invalid' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should use default date range when not provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/analytics/trends')
        .expect(200);

      // Should use default 90 days
      expect(mockPool.query).toHaveBeenCalled();
    });
  });
});