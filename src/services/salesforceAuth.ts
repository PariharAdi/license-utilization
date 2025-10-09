import Cookies from 'js-cookie';
import { SalesforceAuthResponse, SalesforceUserInfo, SalesforceUser } from '../types/auth';

// Salesforce OAuth configuration
const SALESFORCE_CONFIG = {
  clientId: import.meta.env.VITE_SALESFORCE_CLIENT_ID || '3MVG9pRzvMkjMb6lZlt3YjDQwe.demo.client.id',
  redirectUri: import.meta.env.VITE_SALESFORCE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  loginUrl: import.meta.env.VITE_SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  scope: 'api id web refresh_token'
};

export class SalesforceAuthService {
  private static instance: SalesforceAuthService;
  
  public static getInstance(): SalesforceAuthService {
    if (!SalesforceAuthService.instance) {
      SalesforceAuthService.instance = new SalesforceAuthService();
    }
    return SalesforceAuthService.instance;
  }

  // Initiate Salesforce OAuth flow
  public initiateLogin(): void {
    const state = this.generateRandomString(32);
    Cookies.set('oauth_state', state, { expires: 1/24 }); // 1 hour

    const authUrl = new URL(`${SALESFORCE_CONFIG.loginUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', SALESFORCE_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', SALESFORCE_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', SALESFORCE_CONFIG.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'login');

    window.location.href = authUrl.toString();
  }

  // Handle OAuth callback
  public async handleCallback(code: string, state: string): Promise<SalesforceUser> {
    // Verify state parameter
    const storedState = Cookies.get('oauth_state');
    if (!storedState || storedState !== state) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }

    // Clean up state cookie
    Cookies.remove('oauth_state');

    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      // Get user information
      const userInfo = await this.getUserInfo(tokenResponse.access_token, tokenResponse.instance_url);
      
      // Store tokens securely
      this.storeTokens(tokenResponse);
      
      // Transform user info to our format
      const user = this.transformUserInfo(userInfo);
      
      return user;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('Failed to complete authentication');
    }
  }

  // Exchange authorization code for access token
  private async exchangeCodeForToken(code: string): Promise<SalesforceAuthResponse> {
    const tokenUrl = `${SALESFORCE_CONFIG.loginUrl}/services/oauth2/token`;
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: SALESFORCE_CONFIG.clientId,
      redirect_uri: SALESFORCE_CONFIG.redirectUri,
      code: code
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
    }

    return await response.json();
  }

  // Get user information from Salesforce
  private async getUserInfo(accessToken: string, instanceUrl: string): Promise<SalesforceUserInfo> {
    const userInfoUrl = `${instanceUrl}/services/oauth2/userinfo`;
    
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json();
  }

  // Store tokens securely
  private storeTokens(tokenResponse: SalesforceAuthResponse): void {
    // Store in secure HTTP-only cookies (in production)
    // For demo purposes, using regular cookies with secure flags
    const cookieOptions = {
      expires: 7, // 7 days
      secure: window.location.protocol === 'https:',
      sameSite: 'strict' as const
    };

    Cookies.set('sf_access_token', tokenResponse.access_token, cookieOptions);
    Cookies.set('sf_instance_url', tokenResponse.instance_url, cookieOptions);
    Cookies.set('sf_user_id', tokenResponse.id, cookieOptions);
  }

  // Get stored tokens
  public getStoredTokens(): { accessToken: string | null; instanceUrl: string | null; userId: string | null } {
    return {
      accessToken: Cookies.get('sf_access_token') || null,
      instanceUrl: Cookies.get('sf_instance_url') || null,
      userId: Cookies.get('sf_user_id') || null
    };
  }

  // Logout user
  public logout(): void {
    // Clear all auth cookies
    Cookies.remove('sf_access_token');
    Cookies.remove('sf_instance_url');
    Cookies.remove('sf_user_id');
    
    // Redirect to Salesforce logout
    const logoutUrl = `${SALESFORCE_CONFIG.loginUrl}/services/auth/idp/saml/slo`;
    window.location.href = logoutUrl;
  }

  // Validate current session
  public async validateSession(): Promise<SalesforceUser | null> {
    const { accessToken, instanceUrl } = this.getStoredTokens();
    
    if (!accessToken || !instanceUrl) {
      return null;
    }

    try {
      const userInfo = await this.getUserInfo(accessToken, instanceUrl);
      return this.transformUserInfo(userInfo);
    } catch (error) {
      console.error('Session validation failed:', error);
      this.logout();
      return null;
    }
  }

  // Transform Salesforce user info to our format
  private transformUserInfo(userInfo: SalesforceUserInfo): SalesforceUser {
    return {
      id: userInfo.user_id,
      username: userInfo.username,
      email: userInfo.email,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      displayName: userInfo.display_name,
      organizationId: userInfo.organization_id,
      organizationName: userInfo.organization.name,
      profileId: '', // Would need additional API call to get profile ID
      profileName: userInfo.profile.name,
      userType: userInfo.user_type,
      isActive: userInfo.active,
      lastLoginDate: userInfo.last_modified_date,
      photoUrl: userInfo.photos?.picture
    };
  }

  // Generate random string for state parameter
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const salesforceAuth = SalesforceAuthService.getInstance();