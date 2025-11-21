import { pool } from '../config/database';
import { Organization } from '../types';

export class OrganizationModel {
  static async findBySalesforceId(salesforceOrgId: string): Promise<Organization | null> {
    const query = `
      SELECT id, salesforce_org_id, org_name, instance_url, created_at, updated_at
      FROM organizations
      WHERE salesforce_org_id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [salesforceOrgId]);
    return result.rows[0] || null;
  }

  static async create(data: {
    salesforceOrgId: string;
    orgName: string;
    instanceUrl: string;
  }): Promise<Organization> {
    const query = `
      INSERT INTO organizations (salesforce_org_id, org_name, instance_url)
      VALUES ($1, $2, $3)
      RETURNING id, salesforce_org_id, org_name, instance_url, created_at, updated_at
    `;

    const result = await pool.query(query, [
      data.salesforceOrgId,
      data.orgName,
      data.instanceUrl,
    ]);

    return result.rows[0];
  }

  static async update(id: string, data: Partial<{
    orgName: string;
    instanceUrl: string;
  }>): Promise<Organization | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.orgName) {
      fields.push(`org_name = $${paramCount++}`);
      values.push(data.orgName);
    }

    if (data.instanceUrl) {
      fields.push(`instance_url = $${paramCount++}`);
      values.push(data.instanceUrl);
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);

    const query = `
      UPDATE organizations
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, salesforce_org_id, org_name, instance_url, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<Organization | null> {
    const query = `
      SELECT id, salesforce_org_id, org_name, instance_url, created_at, updated_at
      FROM organizations
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<Organization[]> {
    const query = `
      SELECT id, salesforce_org_id, org_name, instance_url, created_at, updated_at
      FROM organizations
      WHERE is_active = true
      ORDER BY org_name
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async deactivate(id: string): Promise<boolean> {
    const query = `
      UPDATE organizations
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Backwards compatible placeholder export (if other modules import `Organization` class)
// Note: don't export a value named `Organization` to avoid colliding with the type import from ../types