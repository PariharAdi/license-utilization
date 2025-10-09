import { Request, Response } from 'express';
import { SalesforceAuthService } from '../services/SalesforceAuthService';
import { ApiResponse } from '../types';

export class AuthController {
  /**
   * Initiate Salesforce OAuth flow
   * GET /api/auth/salesforce
   */
  static async initiateSalesforceAuth(req: Request, res: Response): Promise<void> {
    try {
      const { url, state } = await SalesforceAuthService.getAuthorizationUrl();

      // Store state in session for additional validation if needed
      req.session = req.session || {};
      req.session.oauthState = state;

      const response: ApiResponse = {
        success: true,
        data: { authUrl: url, state },
        message: 'Authorization URL generated successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error initiating Salesforce auth:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to initiate authentication',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Handle Salesforce OAuth callback
   * GET /api/auth/salesforce/callback
   */
  static async handleSalesforceCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error } = req.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      // Handle OAuth errors
      if (error) {
        console.error('OAuth error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
      }

      // Validate required parameters
      if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_parameters`);
      }

      // Authenticate user
      const { user, organization, tokens } = await SalesforceAuthService.authenticateUser(code, state);

      // Generate JWT token for frontend
      const jwtToken = SalesforceAuthService.generateJWTToken(user, organization);

      // Set secure HTTP-only cookie
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?success=true`);

    } catch (error) {
      console.error('OAuth callback error:', error);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('authentication_failed')}`);
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // User should be available from auth middleware
      const user = (req as any).user;
      const organization = (req as any).organization;

      if (!user || !organization) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileName: user.profileName,
            userRoleName: user.userRoleName,
            licenseType: user.licenseType,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
          },
          organization: {
            id: organization.id,
            orgName: organization.orgName,
            salesforceOrgId: organization.salesforceOrgId,
          },
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting current user:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to get user information',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const organization = (req as any).organization;

      if (!user || !organization) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        return res.status(401).json(response);
      }

      // Get stored tokens
      const storedTokens = await SalesforceAuthService.getStoredTokens(user.id);

      if (!storedTokens || !storedTokens.refreshToken) {
        const response: ApiResponse = {
          success: false,
          error: 'No refresh token available',
        };
        return res.status(401).json(response);
      }

      // Refresh tokens
      const newTokens = await SalesforceAuthService.refreshAccessToken(storedTokens.refreshToken);

      // Store new tokens
      await SalesforceAuthService.storeTokens(user, newTokens);

      // Generate new JWT token
      const jwtToken = SalesforceAuthService.generateJWTToken(user, organization);

      // Update cookie
      res.cookie('auth_token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error refreshing token:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to refresh token',
      };

      res.status(401).json(response);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (user) {
        // Clear stored tokens
        await SalesforceAuthService.logout(user.id);
      }

      // Clear auth cookie
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      res.json(response);
    } catch (error) {
      console.error('Error during logout:', error);

      const response: ApiResponse = {
        success: false,
        error: 'Failed to logout',
      };

      res.status(500).json(response);
    }
  }

  /**
   * Check authentication status
   * GET /api/auth/status
   */
  static async checkAuthStatus(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const organization = (req as any).organization;

    const response: ApiResponse = {
      success: true,
      data: {
        isAuthenticated: !!user,
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          organizationId: organization?.id,
          orgName: organization?.orgName,
        } : null,
      },
    };

    res.json(response);
  }
}