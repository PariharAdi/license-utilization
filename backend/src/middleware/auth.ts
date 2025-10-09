import { Request, Response, NextFunction } from 'express';
import { SalesforceAuthService } from '../services/SalesforceAuthService';
import { UserModel } from '../models/User';
import { OrganizationModel } from '../models/Organization';
import { ApiResponse } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      organization?: any;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: any;
  organization: any;
}

/**
 * Middleware to authenticate requests using JWT token from cookie
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from cookie
    const token = req.cookies.auth_token;

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    // Validate JWT token
    let decoded;
    try {
      decoded = SalesforceAuthService.validateJWTToken(token);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
      return;
    }

    // Get user from database
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(401).json(response);
      return;
    }

    // Get organization
    const organization = await OrganizationModel.findById(user.organizationId);
    if (!organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Organization not found',
      };
      res.status(401).json(response);
      return;
    }

    // Check if user is still active
    if (!user.isActive) {
      const response: ApiResponse = {
        success: false,
        error: 'User account is inactive',
      };
      res.status(403).json(response);
      return;
    }

    // Attach user and organization to request
    req.user = user;
    req.organization = organization;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Authentication failed',
    };

    res.status(500).json(response);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token present
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.auth_token;

    if (token) {
      try {
        const decoded = SalesforceAuthService.validateJWTToken(token);
        const user = await UserModel.findById(decoded.userId);

        if (user && user.isActive) {
          const organization = await OrganizationModel.findById(user.organizationId);
          if (organization) {
            req.user = user;
            req.organization = organization;
          }
        }
      } catch (error) {
        // Ignore errors in optional auth
        console.log('Optional authentication failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    next();
  }
};

/**
 * Middleware to check if user has admin permissions
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (!user) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication required',
    };
    res.status(401).json(response);
    return;
  }

  // Check if user has admin profile or system administrator permissions
  const adminProfiles = ['System Administrator', 'Salesforce API Only System Integrations'];
  const isAdmin = adminProfiles.some(profile =>
    user.profileName && user.profileName.includes(profile)
  );

  if (!isAdmin) {
    const response: ApiResponse = {
      success: false,
      error: 'Administrator privileges required',
    };
    res.status(403).json(response);
    return;
  }

  next();
};

/**
 * Middleware to check if user belongs to specific organization
 */
export const requireOrganization = (orgId: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    const organization = req.organization;

    if (!user || !organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    if (organization.id !== orgId && organization.salesforceOrgId !== orgId) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied for this organization',
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
};

/**
 * Middleware to validate organization access from request parameters
 */
export const validateOrgAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orgId } = req.params;
    const user = req.user;
    const organization = req.organization;

    if (!user || !organization) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    // If orgId is provided in URL, validate access
    if (orgId) {
      if (organization.id !== orgId && organization.salesforceOrgId !== orgId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied for this organization',
        };
        res.status(403).json(response);
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Organization validation error:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Organization validation failed',
    };

    res.status(500).json(response);
  }
};

/**
 * Middleware to check Salesforce token validity
 */
export const validateSalesforceToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    // Check if stored Salesforce tokens are valid
    const storedTokens = await SalesforceAuthService.getStoredTokens(user.id);

    if (!storedTokens) {
      const response: ApiResponse = {
        success: false,
        error: 'Salesforce authentication expired. Please login again.',
      };
      res.status(401).json(response);
      return;
    }

    // Check if token is expired (with 5-minute buffer)
    if (storedTokens.expiresAt && storedTokens.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
      // Try to refresh token if refresh token is available
      if (storedTokens.refreshToken) {
        try {
          const newTokens = await SalesforceAuthService.refreshAccessToken(storedTokens.refreshToken);
          await SalesforceAuthService.storeTokens(user, newTokens);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);

          const response: ApiResponse = {
            success: false,
            error: 'Salesforce authentication expired. Please login again.',
          };
          res.status(401).json(response);
          return;
        }
      } else {
        const response: ApiResponse = {
          success: false,
          error: 'Salesforce authentication expired. Please login again.',
        };
        res.status(401).json(response);
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Salesforce token validation error:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Token validation failed',
    };

    res.status(500).json(response);
  }
};