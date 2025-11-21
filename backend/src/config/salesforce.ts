import fetch from 'node-fetch';

export const SALESFORCE_CONFIG = {
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  username: process.env.SALESFORCE_USERNAME!,
  password: process.env.SALESFORCE_PASSWORD!,
  tokenUrl: process.env.SALESFORCE_TOKEN_URL || 'https://login.salesforce.com/services/oauth2/token',
  apiVersion: process.env.SALESFORCE_API_VERSION || 'v61.0',
};

// Validate function to be called after dotenv.config()
export const validateSalesforceConfig = (): void => {
  if (!SALESFORCE_CONFIG.clientId) {
    throw new Error('SALESFORCE_CLIENT_ID environment variable is required');
  }

  if (!SALESFORCE_CONFIG.clientSecret) {
    throw new Error('SALESFORCE_CLIENT_SECRET environment variable is required');
  }

  if (!SALESFORCE_CONFIG.username) {
    throw new Error('SALESFORCE_USERNAME environment variable is required');
  }

  if (!SALESFORCE_CONFIG.password) {
    throw new Error('SALESFORCE_PASSWORD environment variable is required');
  }
};

// Required Salesforce permissions for the application
export const REQUIRED_PERMISSIONS = [
  'ViewEventLogFiles',
  'ViewAllData',
  'ApiEnabled',
  'RunReports',
  'ManageUsers',
] as const;

// Event types we'll monitor
export const MONITORED_EVENT_TYPES = [
  'Login',
  'Logout',
  'URI',
  'API',
  'Report',
  'Dashboard',
  'RestApi',
  'ApexExecution',
  'BulkApi',
] as const;