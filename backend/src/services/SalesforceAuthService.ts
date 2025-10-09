import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createSalesforceConnection, createAuthenticatedConnection } from '../config/salesforce';
import { OrganizationModel } from '../models/Organization';
import { UserModel } from '../models/User';
import { redis } from '../config/database';
import { SalesforceUser, SalesforceTokens, Organization, User } from '../types';

export class SalesforceAuthService {
  private static readonly STATE_EXPIRY = 3600; // 1 hour in seconds
  private static readonly TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Generate OAuth state parameter and store in Redis
   */
  static async generateOAuthState(): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    await redis.setex(`oauth_state:${state}`, this.STATE_EXPIRY, JSON.stringify({
      created: Date.now(),
      used: false,
    }));
    return state;
  }

  /**
   * Validate OAuth state parameter
   */
  static async validateOAuthState(state: string): Promise<boolean> {
    try {
      const stateData = await redis.get(`oauth_state:${state}`);
      if (!stateData) return false;

      const parsedData = JSON.parse(stateData);
      if (parsedData.used) return false;

      // Mark state as used
      await redis.setex(`oauth_state:${state}`, this.STATE_EXPIRY, JSON.stringify({
        ...parsedData,
        used: true,
      }));

      return true;
    } catch (error) {
      console.error('Error validating OAuth state:', error);
      return false;
    }
  }

  /**
   * Get Salesforce authorization URL
   */
  static getAuthorizationUrl(): Promise<{ url: string; state: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const conn = createSalesforceConnection();
        const state = await this.generateOAuthState();

        const authUrl = conn.oauth2.getAuthorizationUrl({
          scope: 'api id web refresh_token',
          state: state,
        });

        resolve({ url: authUrl, state });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string, state: string): Promise<SalesforceTokens> {
    // Validate state
    const isValidState = await this.validateOAuthState(state);
    if (!isValidState) {
      throw new Error('Invalid or expired state parameter');
    }

    const conn = createSalesforceConnection();

    return new Promise((resolve, reject) => {
      conn.oauth2.requestToken(code, (error, tokenResponse) => {
        if (error) {
          reject(new Error(`Token exchange failed: ${error.message}`));
          return;
        }

        if (!tokenResponse) {
          reject(new Error('No token response received'));
          return;
        }

        const tokens: SalesforceTokens = {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          instanceUrl: tokenResponse.instance_url,
          userId: this.extractIdFromUrl(tokenResponse.id),
          organizationId: this.extractOrgIdFromUrl(tokenResponse.id),
          expiresAt: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000),
        };

        resolve(tokens);
      });
    });
  }

  /**
   * Get user information from Salesforce
   */
  static async getSalesforceUserInfo(tokens: SalesforceTokens): Promise<SalesforceUser> {
    const conn = createAuthenticatedConnection(tokens.accessToken, tokens.instanceUrl);

    return new Promise((resolve, reject) => {
      conn.identity((error, identityResponse) => {
        if (error) {
          reject(new Error(`Failed to get user info: ${error.message}`));
          return;
        }

        if (!identityResponse) {
          reject(new Error('No identity response received'));
          return;
        }

        const userInfo: SalesforceUser = {
          id: identityResponse.user_id,
          username: identityResponse.username,
          email: identityResponse.email,
          firstName: identityResponse.first_name,
          lastName: identityResponse.last_name,
          displayName: identityResponse.display_name,
          organizationId: identityResponse.organization_id,
          organizationName: identityResponse.organization?.name || 'Unknown Org',
          profileId: '', // Would need additional query
          profileName: '', // Would need additional query
          userType: identityResponse.user_type,
          isActive: identityResponse.active,
          lastLoginDate: identityResponse.last_modified_date,
          photoUrl: identityResponse.photos?.picture,
        };

        resolve(userInfo);
      });
    });
  }

  /**
   * Store tokens securely in database/Redis
   */
  static async storeTokens(user: User, tokens: SalesforceTokens): Promise<void> {
    const tokenKey = `sf_tokens:${user.id}`;

    // Hash tokens for security
    const hashedTokens = {
      accessToken: this.hashToken(tokens.accessToken),
      refreshToken: tokens.refreshToken ? this.hashToken(tokens.refreshToken) : undefined,
      instanceUrl: tokens.instanceUrl,
      userId: tokens.userId,
      organizationId: tokens.organizationId,
      expiresAt: tokens.expiresAt?.toISOString(),
    };

    await redis.setex(tokenKey, this.TOKEN_EXPIRY, JSON.stringify(hashedTokens));
  }

  /**
   * Authenticate user with Salesforce and create/update local user record
   */
  static async authenticateUser(code: string, state: string): Promise<{ user: User; organization: Organization; tokens: SalesforceTokens }> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, state);

      // Get user info from Salesforce
      const salesforceUser = await this.getSalesforceUserInfo(tokens);

      // Find or create organization
      let organization = await OrganizationModel.findBySalesforceId(salesforceUser.organizationId);
      if (!organization) {
        organization = await OrganizationModel.create({
          salesforceOrgId: salesforceUser.organizationId,
          orgName: salesforceUser.organizationName,
          instanceUrl: tokens.instanceUrl,
        });
      }

      // Find or create user
      let user = await UserModel.findBySalesforceId(organization.id, salesforceUser.id);
      if (!user) {
        user = await UserModel.create({
          orgId: organization.id,
          salesforceUserId: salesforceUser.id,
          username: salesforceUser.username,
          email: salesforceUser.email,
          firstName: salesforceUser.firstName,
          lastName: salesforceUser.lastName,
          profileId: salesforceUser.profileId,
          profileName: salesforceUser.profileName,
          userRoleId: undefined, // Would need additional query
          userRoleName: undefined, // Would need additional query
          licenseType: undefined, // Would need additional query
          isActive: salesforceUser.isActive,
          lastLogin: salesforceUser.lastLoginDate ? new Date(salesforceUser.lastLoginDate) : undefined,
        });
      } else {
        // Update existing user
        await UserModel.update(user.id, {
          username: salesforceUser.username,
          email: salesforceUser.email,
          firstName: salesforceUser.firstName,
          lastName: salesforceUser.lastName,
          isActive: salesforceUser.isActive,
          lastLogin: new Date(),
        });
      }

      // Store tokens
      await this.storeTokens(user, tokens);

      return { user, organization, tokens };
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT token for frontend authentication
   */
  static generateJWTToken(user: User, organization: Organization): string {
    const payload = {
      userId: user.id,
      salesforceUserId: user.salesforceUserId,
      organizationId: organization.id,
      salesforceOrgId: organization.salesforceOrgId,
      email: user.email,
      username: user.username,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  /**
   * Validate JWT token
   */
  static validateJWTToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get stored tokens for a user
   */
  static async getStoredTokens(userId: string): Promise<SalesforceTokens | null> {
    try {
      const tokenKey = `sf_tokens:${userId}`;
      const tokenData = await redis.get(tokenKey);

      if (!tokenData) return null;

      const parsedTokens = JSON.parse(tokenData);
      return {
        accessToken: parsedTokens.accessToken,
        refreshToken: parsedTokens.refreshToken,
        instanceUrl: parsedTokens.instanceUrl,
        userId: parsedTokens.userId,
        organizationId: parsedTokens.organizationId,
        expiresAt: parsedTokens.expiresAt ? new Date(parsedTokens.expiresAt) : undefined,
      };
    } catch (error) {
      console.error('Error retrieving stored tokens:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<SalesforceTokens> {
    const conn = createSalesforceConnection();

    return new Promise((resolve, reject) => {
      conn.oauth2.refreshToken(refreshToken, (error, tokenResponse) => {
        if (error) {
          reject(new Error(`Token refresh failed: ${error.message}`));
          return;
        }

        if (!tokenResponse) {
          reject(new Error('No token response received'));
          return;
        }

        const tokens: SalesforceTokens = {
          accessToken: tokenResponse.access_token,
          instanceUrl: tokenResponse.instance_url,
          userId: this.extractIdFromUrl(tokenResponse.id),
          organizationId: this.extractOrgIdFromUrl(tokenResponse.id),
          expiresAt: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000),
        };

        resolve(tokens);
      });
    });
  }

  /**
   * Logout user and clear tokens
   */
  static async logout(userId: string): Promise<void> {
    const tokenKey = `sf_tokens:${userId}`;
    await redis.del(tokenKey);
  }

  // Helper methods
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static extractIdFromUrl(idUrl: string): string {
    const parts = idUrl.split('/');
    return parts[parts.length - 1];
  }

  private static extractOrgIdFromUrl(idUrl: string): string {
    const parts = idUrl.split('/');
    const orgIndex = parts.indexOf('00D') !== -1 ? parts.indexOf('00D') : parts.length - 2;
    return parts[orgIndex];
  }
}