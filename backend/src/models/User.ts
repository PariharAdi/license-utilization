import { pool } from '../config/database';
import { User, FilterOptions, PaginatedResponse } from '../types';

export class UserModel {
  static async findBySalesforceId(
    orgId: string,
    salesforceUserId: string
  ): Promise<User | null> {
    const query = `
      SELECT * FROM users
      WHERE org_id = $1 AND salesforce_user_id = $2
    `;

    const result = await pool.query(query, [orgId, salesforceUserId]);
    return result.rows[0] || null;
  }

  static async create(data: {
    orgId: string;
    salesforceUserId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileId?: string;
    profileName?: string;
    userRoleId?: string;
    userRoleName?: string;
    licenseType?: string;
    isActive: boolean;
    lastLogin?: Date;
  }): Promise<User> {
    const query = `
      INSERT INTO users (
        org_id, salesforce_user_id, username, email, first_name, last_name,
        profile_id, profile_name, user_role_id, user_role_name,
        license_type, is_active, last_login
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.orgId,
      data.salesforceUserId,
      data.username,
      data.email,
      data.firstName,
      data.lastName,
      data.profileId,
      data.profileName,
      data.userRoleId,
      data.userRoleName,
      data.licenseType,
      data.isActive,
      data.lastLogin,
    ]);

    return result.rows[0];
  }

  static async update(
    id: string,
    data: Partial<User>
  ): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updateableFields = [
      'username', 'email', 'firstName', 'lastName', 'profileId',
      'profileName', 'userRoleId', 'userRoleName', 'licenseType',
      'isActive', 'lastLogin'
    ];

    updateableFields.forEach(field => {
      if (data[field as keyof User] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = $${paramCount++}`);
        values.push(data[field as keyof User]);
      }
    });

    if (fields.length === 0) {
      return null;
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async findByOrgId(
    orgId: string,
    filters: FilterOptions = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<User>> {
    let whereConditions = ['org_id = $1'];
    let values: any[] = [orgId];
    let paramCount = 2;

    // Apply filters
    if (filters.profile && filters.profile.length > 0) {
      whereConditions.push(`profile_name = ANY($${paramCount})`);
      values.push(filters.profile);
      paramCount++;
    }

    if (filters.role && filters.role.length > 0) {
      whereConditions.push(`user_role_name = ANY($${paramCount})`);
      values.push(filters.role);
      paramCount++;
    }

    if (filters.licenseType && filters.licenseType.length > 0) {
      whereConditions.push(`license_type = ANY($${paramCount})`);
      values.push(filters.licenseType);
      paramCount++;
    }

    if (filters.isActive !== undefined) {
      whereConditions.push(`is_active = $${paramCount}`);
      values.push(filters.isActive);
      paramCount++;
    }

    // Usage level filtering would require joining with user_activities
    // This is a simplified version - in reality, you'd calculate usage levels
    // based on recent activity data

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const dataQuery = `
      SELECT *
      FROM users
      WHERE ${whereClause}
      ORDER BY username
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT * FROM users WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getUniqueProfiles(orgId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT profile_name
      FROM users
      WHERE org_id = $1 AND profile_name IS NOT NULL
      ORDER BY profile_name
    `;

    const result = await pool.query(query, [orgId]);
    return result.rows.map(row => row.profile_name);
  }

  static async getUniqueRoles(orgId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT user_role_name
      FROM users
      WHERE org_id = $1 AND user_role_name IS NOT NULL
      ORDER BY user_role_name
    `;

    const result = await pool.query(query, [orgId]);
    return result.rows.map(row => row.user_role_name);
  }

  static async getUniqueLicenseTypes(orgId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT license_type
      FROM users
      WHERE org_id = $1 AND license_type IS NOT NULL
      ORDER BY license_type
    `;

    const result = await pool.query(query, [orgId]);
    return result.rows.map(row => row.license_type);
  }

  static async getUserCounts(orgId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM users
      WHERE org_id = $1
    `;

    const result = await pool.query(query, [orgId]);
    return result.rows[0];
  }
}