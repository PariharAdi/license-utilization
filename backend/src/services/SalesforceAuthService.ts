import fetch from 'node-fetch';
import { SALESFORCE_CONFIG } from '../config/salesforce';
import { logger } from '../utils/logger';
import { SalesforceTokenResponse } from '../types';

class SalesforceAuthService {
  private static instance: SalesforceAuthService;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiry: Date | null = null;

  private constructor() { }

  public static getInstance(): SalesforceAuthService {
    if (!SalesforceAuthService.instance) {
      SalesforceAuthService.instance = new SalesforceAuthService();
    }
    return SalesforceAuthService.instance;
  }

  /**
   * Authenticate with Salesforce using OAuth 2.0 Password Grant
   */
  async authenticate(): Promise<SalesforceTokenResponse> {
    try {
      logger.info('🔄 Authenticating with Salesforce...');

      const tokenUrl = SALESFORCE_CONFIG.tokenUrl;
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: SALESFORCE_CONFIG.clientId,
        client_secret: SALESFORCE_CONFIG.clientSecret,
        username: SALESFORCE_CONFIG.username,
        password: SALESFORCE_CONFIG.password,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Salesforce authentication failed: ${response.status} - ${errorText}`);
        throw new Error(`Salesforce authentication failed: ${response.status} - ${errorText}`);
      }

      const tokenData: SalesforceTokenResponse = await response.json() as SalesforceTokenResponse;

      // Store token and instance URL
      this.accessToken = tokenData.access_token;
      this.instanceUrl = tokenData.instance_url;

      // Set token expiry (Salesforce tokens typically last 2 hours)
      this.tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);

      logger.info('✅ Salesforce authentication successful');
      logger.info(`📍 Instance URL: ${this.instanceUrl}`);

      return tokenData;
    } catch (error) {
      logger.error('❌ Salesforce authentication error:', error);
      this.clearToken();
      throw error;
    }
  }

  /**
   * Get valid access token (authenticate if needed)
   */
  async getAccessToken(): Promise<string> {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Failed to obtain valid access token');
    }

    return this.accessToken;
  }

  /**
   * Get instance URL
   */
  getInstanceUrl(): string {
    if (!this.instanceUrl) {
      throw new Error('Instance URL not available. Please authenticate first.');
    }
    return this.instanceUrl;
  }

  /**
   * Check if current token is valid
   */
  isTokenValid(): boolean {
    return !!(
      this.accessToken &&
      this.instanceUrl &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    );
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.accessToken = null;
    this.instanceUrl = null;
    this.tokenExpiry = null;
    logger.info('🧹 Salesforce token cleared');
  }

  /**
   * Make authenticated API call to Salesforce
   */
  async makeApiCall(endpoint: string, options: any = {}): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const instanceUrl = this.getInstanceUrl();
      const url = `${instanceUrl}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ Salesforce API call failed: ${response.status} - ${errorText}`);

        // If unauthorized, clear token and retry once
        if (response.status === 401) {
          logger.info('🔄 Token expired, retrying authentication...');
          this.clearToken();
          return this.makeApiCall(endpoint, options);
        }

        throw new Error(`Salesforce API call failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('❌ Salesforce API call error:', error);
      throw error;
    }
  }
}

export default SalesforceAuthService;