import request from 'supertest';
import express from 'express';
import { ReportController } from '../src/controllers/ReportController';
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
app.get('/reports/pdf', ReportController.generatePDFReport);
app.get('/reports/excel', ReportController.generateExcelReport);

const mockPool = pool as jest.Mocked<typeof pool>;

describe('ReportController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /reports/pdf', () => {
    it('should generate PDF report with overview data', async () => {
      // Mock database responses for overview data
      const mockUserCounts = {
        rows: [{ total_users: '100', active_users: '85', inactive_users: '15' }]
      };

      const mockLicenses = {
        rows: [
          { license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, utilization_percent: 90 }
        ]
      };

      mockPool.query
        .mockResolvedValueOnce(mockUserCounts)
        .mockResolvedValueOnce(mockLicenses);

      const response = await request(app)
        .get('/reports/pdf')
        .query({ reportType: 'overview', dateRange: '30' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('salesforce-license-report');
      expect(response.body).toBeDefined();
    });

    it('should generate PDF report with all data types', async () => {
      // Mock all required database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_users: '100', active_users: '85', inactive_users: '15' }] })
        .mockResolvedValueOnce({ rows: [{ license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, utilization_percent: 90 }] })
        .mockResolvedValueOnce({ rows: [{ heavyUsers: 10, mediumUsers: 25, lightUsers: 30, inactiveUsers: 20 }] })
        .mockResolvedValueOnce({ rows: [{ username: 'test.user', licenseType: 'Salesforce', lastLogin: '2024-01-01' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, unused_licenses: 5, utilization_percent: 90 }] });

      const response = await request(app)
        .get('/reports/pdf')
        .query({ reportType: 'all', dateRange: '90' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(mockPool.query).toHaveBeenCalledTimes(7);
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/reports/pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate PDF report');
    });
  });

  describe('GET /reports/excel', () => {
    it('should generate Excel report with overview data', async () => {
      // Mock database responses for overview data
      const mockUserCounts = {
        rows: [{ total_users: '100', active_users: '85', inactive_users: '15' }]
      };

      const mockLicenses = {
        rows: [
          { license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, utilization_percent: 90 },
          { license_type: 'Platform', total_licenses: 25, used_licenses: 20, utilization_percent: 80 }
        ]
      };

      mockPool.query
        .mockResolvedValueOnce(mockUserCounts)
        .mockResolvedValueOnce(mockLicenses);

      const response = await request(app)
        .get('/reports/excel')
        .query({ reportType: 'overview', dateRange: '30' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('salesforce-license-report');
      expect(response.body).toBeDefined();
    });

    it('should generate Excel report with users worksheet', async () => {
      // Mock user data
      const mockUserData = {
        rows: [
          {
            username: 'test.user1@example.com',
            email: 'test.user1@example.com',
            license_type: 'Salesforce',
            profile_name: 'System Administrator',
            last_login: '2024-01-15',
            total_activity: '150',
            total_logins: '50',
            total_api_requests: '75',
            total_reports: '25',
            usage_level: 'Power User'
          },
          {
            username: 'test.user2@example.com',
            email: 'test.user2@example.com',
            license_type: 'Platform',
            profile_name: 'Standard User',
            last_login: '2024-01-10',
            total_activity: '25',
            total_logins: '15',
            total_api_requests: '8',
            total_reports: '2',
            usage_level: 'Casual User'
          }
        ]
      };

      mockPool.query.mockResolvedValueOnce(mockUserData);

      const response = await request(app)
        .get('/reports/excel')
        .query({ reportType: 'users', dateRange: '60' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['test-org-id'])
      );
    });

    it('should generate Excel report with recommendations worksheet', async () => {
      // Mock recommendations data
      const mockLicenseAnalysis = {
        rows: [
          {
            license_type: 'Platform',
            total_licenses: 20,
            used_licenses: 8,
            unused_licenses: 12,
            utilization_percent: 40
          }
        ]
      };

      mockPool.query.mockResolvedValueOnce(mockLicenseAnalysis);

      const response = await request(app)
        .get('/reports/excel')
        .query({ reportType: 'recommendations' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should generate comprehensive Excel report with all worksheets', async () => {
      // Mock all required data
      mockPool.query
        // Overview data
        .mockResolvedValueOnce({ rows: [{ total_users: '100', active_users: '85', inactive_users: '15' }] })
        .mockResolvedValueOnce({ rows: [{ license_type: 'Salesforce', total_licenses: 50, used_licenses: 45, utilization_percent: 90 }] })
        // Users data
        .mockResolvedValueOnce({ rows: [{
          username: 'test.user@example.com',
          email: 'test.user@example.com',
          license_type: 'Salesforce',
          profile_name: 'System Admin',
          last_login: '2024-01-15',
          total_activity: '100',
          total_logins: '30',
          total_api_requests: '50',
          total_reports: '20',
          usage_level: 'Power User'
        }] })
        // Recommendations data
        .mockResolvedValueOnce({ rows: [{ license_type: 'Platform', total_licenses: 20, used_licenses: 8, unused_licenses: 12, utilization_percent: 40 }] });

      const response = await request(app)
        .get('/reports/excel')
        .query({ reportType: 'all', dateRange: '90' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockPool.query).toHaveBeenCalledTimes(4); // Overview, users, and recommendations queries
    });

    it('should handle database errors during Excel generation', async () => {
      mockPool.query.mockRejectedValue(new Error('Database query failed'));

      const response = await request(app)
        .get('/reports/excel')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate Excel report');
    });
  });

  describe('Query parameter validation', () => {
    it('should use default values for missing parameters', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_users: '50', active_users: '40', inactive_users: '10' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/reports/pdf')
        .expect(200);

      // Should use default reportType 'overview' and dateRange '90'
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should handle invalid reportType gracefully', async () => {
      // Even with invalid reportType, should not crash
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/reports/excel')
        .query({ reportType: 'invalid', dateRange: '30' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should handle non-numeric dateRange', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/reports/pdf')
        .query({ dateRange: 'thirty' })
        .expect(500); // Should fail when parsing date range

      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('File naming', () => {
    it('should generate filename with current date', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/reports/pdf')
        .expect(200);

      const today = new Date().toISOString().split('T')[0];
      expect(response.headers['content-disposition']).toContain(`salesforce-license-report-${today}.pdf`);
    });

    it('should use correct Excel file extension', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/reports/excel')
        .expect(200);

      const today = new Date().toISOString().split('T')[0];
      expect(response.headers['content-disposition']).toContain(`salesforce-license-report-${today}.xlsx`);
    });
  });
});