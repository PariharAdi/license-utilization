import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Excel from 'exceljs';
import { pool } from '../config/database';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class ReportController {
  /**
   * Generate PDF report
   * GET /api/reports/pdf
   */
  static async generatePDFReport(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const {
        reportType = 'overview',
        dateRange = '90',
        includeCharts = 'true'
      } = req.query as {
        reportType?: string;
        dateRange?: string;
        includeCharts?: string;
      };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const filename = `salesforce-license-report-${new Date().toISOString().split('T')[0]}.pdf`;

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream PDF to response
      doc.pipe(res);

      // Add header
      doc.fontSize(20)
         .fillColor('#2563eb')
         .text('Salesforce License Utilization Report', 50, 50);

      doc.fontSize(12)
         .fillColor('#666666')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 85)
         .text(`Organization: ${organization.orgName}`, 50, 100)
         .text(`Report Period: ${daysBack} days`, 50, 115);

      // Add separator line
      doc.moveTo(50, 140)
         .lineTo(550, 140)
         .stroke('#cccccc');

      let yPosition = 160;

      if (reportType === 'overview' || reportType === 'all') {
        // Get overview data
        const overviewData = await ReportController.getOverviewData(organization.id, startDate);

        // Overview section
        doc.fontSize(16)
           .fillColor('#333333')
           .text('License Overview', 50, yPosition);
        yPosition += 30;

        doc.fontSize(12)
           .text(`Total Users: ${overviewData.totalUsers}`, 50, yPosition)
           .text(`Active Users: ${overviewData.activeUsers}`, 200, yPosition)
           .text(`Inactive Users: ${overviewData.inactiveUsers}`, 350, yPosition);
        yPosition += 25;

        // License utilization details
        doc.text('License Utilization:', 50, yPosition);
        yPosition += 20;

        Object.entries(overviewData.licenseUtilization).forEach(([type, data]: [string, any]) => {
          doc.text(`${type}: ${data.used}/${data.total} (${data.utilization}%)`, 70, yPosition);
          yPosition += 15;
        });

        yPosition += 20;
      }

      if (reportType === 'users' || reportType === 'all') {
        // User activity section
        const userData = await ReportController.getUserActivityData(organization.id, startDate);

        if (yPosition > 700) { // Start new page if needed
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(16)
           .fillColor('#333333')
           .text('User Activity Analysis', 50, yPosition);
        yPosition += 30;

        // Usage level breakdown
        doc.fontSize(12)
           .text('Usage Level Distribution:', 50, yPosition);
        yPosition += 20;

        const usageLevels = userData.usageLevels;
        Object.entries(usageLevels).forEach(([level, count]: [string, any]) => {
          const displayLevel = level.replace('Users', '').replace(/([A-Z])/g, ' $1').trim();
          doc.text(`${displayLevel}: ${count} users`, 70, yPosition);
          yPosition += 15;
        });

        yPosition += 20;

        // Top inactive users
        if (userData.inactiveUsers.length > 0) {
          doc.text('Top Inactive Users (Premium Licenses):', 50, yPosition);
          yPosition += 20;

          userData.inactiveUsers.slice(0, 10).forEach(user => {
            doc.fontSize(10)
               .text(`${user.username} (${user.licenseType}) - Last login: ${user.lastLogin || 'Never'}`, 70, yPosition);
            yPosition += 12;
          });
        }
      }

      if (reportType === 'recommendations' || reportType === 'all') {
        // Recommendations section
        const recommendations = await ReportController.getRecommendationsData(organization.id, startDate);

        if (yPosition > 600) { // Start new page if needed
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(16)
           .fillColor('#333333')
           .text('Optimization Recommendations', 50, yPosition);
        yPosition += 30;

        recommendations.recommendations.slice(0, 10).forEach((rec: any) => {
          const priorityColor = rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#ea580c' : '#16a34a';

          doc.fontSize(12)
             .fillColor(priorityColor)
             .text(`[${rec.priority.toUpperCase()}] ${rec.title}`, 50, yPosition);
          yPosition += 18;

          doc.fontSize(10)
             .fillColor('#666666')
             .text(rec.description, 50, yPosition, { width: 500 });
          yPosition += 25;

          doc.fontSize(10)
             .fillColor('#333333')
             .text(`Action: ${rec.action}`, 70, yPosition);
          yPosition += 20;
        });
      }

      // Add footer
      doc.fontSize(8)
         .fillColor('#888888')
         .text('Generated by Salesforce License Utilization Inspector', 50, doc.page.height - 50);

      // Finalize PDF
      doc.end();

    } catch (error) {
      logger.error('Error generating PDF report:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate PDF report',
        });
      }
    }
  }

  /**
   * Generate Excel report
   * GET /api/reports/excel
   */
  static async generateExcelReport(req: Request, res: Response): Promise<void> {
    try {
      const organization = req.organization;
      const {
        reportType = 'overview',
        dateRange = '90'
      } = req.query as {
        reportType?: string;
        dateRange?: string;
      };

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Create workbook
      const workbook = new Excel.Workbook();
      const filename = `salesforce-license-report-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Set workbook properties
      workbook.creator = 'Salesforce License Utilization Inspector';
      workbook.created = new Date();
      workbook.modified = new Date();

      if (reportType === 'overview' || reportType === 'all') {
        // Overview worksheet
        const overviewSheet = workbook.addWorksheet('Overview');
        const overviewData = await ReportController.getOverviewData(organization.id, startDate);

        // Header styling
        overviewSheet.getCell('A1').value = 'Salesforce License Utilization Report';
        overviewSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '2563EB' } };
        overviewSheet.mergeCells('A1:D1');

        overviewSheet.getCell('A2').value = `Organization: ${organization.orgName}`;
        overviewSheet.getCell('A3').value = `Generated: ${new Date().toLocaleDateString()}`;
        overviewSheet.getCell('A4').value = `Period: ${daysBack} days`;

        // User summary
        overviewSheet.getCell('A6').value = 'User Summary';
        overviewSheet.getCell('A6').font = { bold: true };

        overviewSheet.getCell('A7').value = 'Total Users';
        overviewSheet.getCell('B7').value = overviewData.totalUsers;
        overviewSheet.getCell('A8').value = 'Active Users';
        overviewSheet.getCell('B8').value = overviewData.activeUsers;
        overviewSheet.getCell('A9').value = 'Inactive Users';
        overviewSheet.getCell('B9').value = overviewData.inactiveUsers;

        // License utilization
        let row = 11;
        overviewSheet.getCell(`A${row}`).value = 'License Utilization';
        overviewSheet.getCell(`A${row}`).font = { bold: true };
        row++;

        overviewSheet.getCell(`A${row}`).value = 'License Type';
        overviewSheet.getCell(`B${row}`).value = 'Used';
        overviewSheet.getCell(`C${row}`).value = 'Total';
        overviewSheet.getCell(`D${row}`).value = 'Utilization %';

        // Style header row
        ['A', 'B', 'C', 'D'].forEach(col => {
          overviewSheet.getCell(`${col}${row}`).font = { bold: true };
          overviewSheet.getCell(`${col}${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F3F4F6' }
          };
        });
        row++;

        Object.entries(overviewData.licenseUtilization).forEach(([type, data]: [string, any]) => {
          overviewSheet.getCell(`A${row}`).value = type;
          overviewSheet.getCell(`B${row}`).value = data.used;
          overviewSheet.getCell(`C${row}`).value = data.total;
          overviewSheet.getCell(`D${row}`).value = `${data.utilization}%`;
          row++;
        });

        // Auto-fit columns
        overviewSheet.columns.forEach(column => {
          column.width = 15;
        });
      }

      if (reportType === 'users' || reportType === 'all') {
        // Users worksheet
        const usersSheet = workbook.addWorksheet('Users');
        const usersData = await ReportController.getDetailedUserData(organization.id, startDate);

        // Headers
        const headers = [
          'Username', 'Email', 'License Type', 'Profile', 'Last Login',
          'Total Activity', 'Logins', 'API Requests', 'Reports', 'Usage Level'
        ];

        headers.forEach((header, index) => {
          const cell = usersSheet.getCell(1, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F3F4F6' }
          };
        });

        // Data rows
        usersData.forEach((user, index) => {
          const row = index + 2;
          usersSheet.getCell(row, 1).value = user.username;
          usersSheet.getCell(row, 2).value = user.email;
          usersSheet.getCell(row, 3).value = user.licenseType;
          usersSheet.getCell(row, 4).value = user.profileName;
          usersSheet.getCell(row, 5).value = user.lastLogin;
          usersSheet.getCell(row, 6).value = user.totalActivity;
          usersSheet.getCell(row, 7).value = user.totalLogins;
          usersSheet.getCell(row, 8).value = user.totalApiRequests;
          usersSheet.getCell(row, 9).value = user.totalReports;
          usersSheet.getCell(row, 10).value = user.usageLevel;

          // Color-code usage levels
          const usageCell = usersSheet.getCell(row, 10);
          switch (user.usageLevel) {
            case 'Power User':
              usageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
              break;
            case 'Regular User':
              usageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
              break;
            case 'Casual User':
              usageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FED7D7' } };
              break;
            case 'Inactive User':
              usageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
              break;
          }
        });

        // Auto-fit columns
        usersSheet.columns.forEach(column => {
          column.width = 15;
        });
      }

      if (reportType === 'recommendations' || reportType === 'all') {
        // Recommendations worksheet
        const recSheet = workbook.addWorksheet('Recommendations');
        const recommendations = await ReportController.getRecommendationsData(organization.id, startDate);

        // Headers
        const headers = ['Priority', 'Type', 'Title', 'Description', 'Impact', 'Action', 'Affected Count'];
        headers.forEach((header, index) => {
          const cell = recSheet.getCell(1, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F3F4F6' }
          };
        });

        // Data rows
        recommendations.recommendations.forEach((rec: any, index: number) => {
          const row = index + 2;
          recSheet.getCell(row, 1).value = rec.priority.toUpperCase();
          recSheet.getCell(row, 2).value = rec.type;
          recSheet.getCell(row, 3).value = rec.title;
          recSheet.getCell(row, 4).value = rec.description;
          recSheet.getCell(row, 5).value = rec.impact;
          recSheet.getCell(row, 6).value = rec.action;
          recSheet.getCell(row, 7).value = rec.affectedCount;

          // Color-code priorities
          const priorityCell = recSheet.getCell(row, 1);
          switch (rec.priority) {
            case 'high':
              priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
              priorityCell.font = { color: { argb: 'DC2626' }, bold: true };
              break;
            case 'medium':
              priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FED7AA' } };
              priorityCell.font = { color: { argb: 'EA580C' }, bold: true };
              break;
            case 'low':
              priorityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
              priorityCell.font = { color: { argb: '16A34A' }, bold: true };
              break;
          }
        });

        // Auto-fit columns
        recSheet.columns.forEach(column => {
          column.width = 20;
        });
      }

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      logger.error('Error generating Excel report:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate Excel report',
        });
      }
    }
  }

  // Helper methods for data fetching
  private static async getOverviewData(orgId: string, startDate: Date) {
    const userCountsQuery = `
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users
      FROM users WHERE org_id = $1
    `;

    const licenseQuery = `
      SELECT license_type, total_licenses, used_licenses, utilization_percent
      FROM license_summaries
      WHERE org_id = $1 AND summary_date = (
        SELECT MAX(summary_date) FROM license_summaries WHERE org_id = $1
      )
    `;

    const [userCounts, licenses] = await Promise.all([
      pool.query(userCountsQuery, [orgId]),
      pool.query(licenseQuery, [orgId]),
    ]);

    const licenseUtilization = licenses.rows.reduce((acc, row) => {
      acc[row.license_type] = {
        total: row.total_licenses,
        used: row.used_licenses,
        utilization: row.utilization_percent,
      };
      return acc;
    }, {} as any);

    return {
      totalUsers: parseInt(userCounts.rows[0].total_users),
      activeUsers: parseInt(userCounts.rows[0].active_users),
      inactiveUsers: parseInt(userCounts.rows[0].inactive_users),
      licenseUtilization,
    };
  }

  private static async getUserActivityData(orgId: string, startDate: Date) {
    const usageLevelsQuery = `
      SELECT
        CASE
          WHEN total_activity >= 100 THEN 'Heavy'
          WHEN total_activity >= 50 THEN 'Medium'
          WHEN total_activity >= 10 THEN 'Light'
          ELSE 'Inactive'
        END as usage_level,
        COUNT(*) as user_count
      FROM (
        SELECT
          u.id,
          COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) as total_activity
        FROM users u
        LEFT JOIN user_activities ua ON u.id = ua.user_id AND ua.activity_date >= $2
        WHERE u.org_id = $1 AND u.is_active = true
        GROUP BY u.id
      ) user_activity_summary
      GROUP BY usage_level
    `;

    const inactiveUsersQuery = `
      SELECT username, license_type, last_login
      FROM users u
      LEFT JOIN user_activities ua ON u.id = ua.user_id AND ua.activity_date >= $2
      WHERE u.org_id = $1 AND u.is_active = true
      GROUP BY u.id, username, license_type, last_login
      HAVING COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs), 0) < 5
      ORDER BY license_type DESC, last_login ASC
      LIMIT 20
    `;

    const [usageLevels, inactiveUsers] = await Promise.all([
      pool.query(usageLevelsQuery, [orgId, startDate.toISOString().split('T')[0]]),
      pool.query(inactiveUsersQuery, [orgId, startDate.toISOString().split('T')[0]]),
    ]);

    const usageLevelCounts = usageLevels.rows.reduce((acc, row) => {
      acc[row.usage_level.toLowerCase() + 'Users'] = parseInt(row.user_count);
      return acc;
    }, { heavyUsers: 0, mediumUsers: 0, lightUsers: 0, inactiveUsers: 0 });

    return {
      usageLevels: usageLevelCounts,
      inactiveUsers: inactiveUsers.rows.map(row => ({
        username: row.username,
        licenseType: row.license_type,
        lastLogin: row.last_login,
      })),
    };
  }

  private static async getDetailedUserData(orgId: string, startDate: Date) {
    const query = `
      SELECT
        u.username,
        u.email,
        u.license_type,
        u.profile_name,
        u.last_login,
        COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) as total_activity,
        COALESCE(SUM(ua.login_count), 0) as total_logins,
        COALESCE(SUM(ua.api_requests), 0) as total_api_requests,
        COALESCE(SUM(ua.report_runs), 0) as total_reports,
        CASE
          WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 500 THEN 'Power User'
          WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 100 THEN 'Regular User'
          WHEN COALESCE(SUM(ua.login_count + ua.api_requests + ua.report_runs + ua.dashboard_views), 0) >= 10 THEN 'Casual User'
          ELSE 'Inactive User'
        END as usage_level
      FROM users u
      LEFT JOIN user_activities ua ON u.id = ua.user_id AND ua.activity_date >= $2
      WHERE u.org_id = $1 AND u.is_active = true
      GROUP BY u.id, u.username, u.email, u.license_type, u.profile_name, u.last_login
      ORDER BY total_activity DESC
    `;

    const result = await pool.query(query, [orgId, startDate.toISOString().split('T')[0]]);

    return result.rows.map(row => ({
      username: row.username,
      email: row.email,
      licenseType: row.license_type,
      profileName: row.profile_name,
      lastLogin: row.last_login,
      totalActivity: parseInt(row.total_activity),
      totalLogins: parseInt(row.total_logins),
      totalApiRequests: parseInt(row.total_api_requests),
      totalReports: parseInt(row.total_reports),
      usageLevel: row.usage_level,
    }));
  }

  private static async getRecommendationsData(orgId: string, startDate: Date) {
    // This reuses the logic from AnalyticsController.getOptimizationRecommendations
    // In a real implementation, you might want to extract this to a shared service
    const licenseAnalysisQuery = `
      SELECT license_type, total_licenses, used_licenses,
             (total_licenses - used_licenses) as unused_licenses, utilization_percent
      FROM license_summaries
      WHERE org_id = $1 AND summary_date = (
        SELECT MAX(summary_date) FROM license_summaries WHERE org_id = $1
      )
    `;

    const licenseAnalysis = await pool.query(licenseAnalysisQuery, [orgId]);
    const recommendations: any[] = [];

    licenseAnalysis.rows.forEach(license => {
      const unusedCount = license.unused_licenses;
      const utilization = license.utilization_percent;

      if (unusedCount > 0) {
        recommendations.push({
          type: 'license_optimization',
          priority: unusedCount > 10 ? 'high' : 'medium',
          title: `${unusedCount} unused ${license.license_type} licenses`,
          description: `You have ${unusedCount} unused ${license.license_type} licenses that could be reallocated or cancelled to reduce costs.`,
          impact: 'cost_savings',
          action: 'Review and reallocate unused licenses',
          affectedCount: unusedCount,
        });
      }

      if (utilization > 90) {
        recommendations.push({
          type: 'capacity_planning',
          priority: 'medium',
          title: `${license.license_type} licenses at ${utilization}% capacity`,
          description: `Your ${license.license_type} licenses are highly utilized. Consider purchasing additional licenses to accommodate growth.`,
          impact: 'capacity_planning',
          action: 'Plan for additional license purchases',
          affectedCount: license.used_licenses,
        });
      }
    });

    return { recommendations };
  }
}