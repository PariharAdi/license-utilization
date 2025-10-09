import jsforce from 'jsforce';

export const salesforceConfig = {
  clientId: process.env.SALESFORCE_CLIENT_ID!,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
  redirectUri: process.env.SALESFORCE_REDIRECT_URI!,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  scope: 'api id web refresh_token',
};

export const createSalesforceConnection = (options?: jsforce.ConnectionOptions): jsforce.Connection => {
  return new jsforce.Connection({
    oauth2: {
      clientId: salesforceConfig.clientId,
      clientSecret: salesforceConfig.clientSecret,
      redirectUri: salesforceConfig.redirectUri,
      loginUrl: salesforceConfig.loginUrl,
    },
    version: '60.0', // Winter '25 API version
    ...options,
  });
};

export const createAuthenticatedConnection = (accessToken: string, instanceUrl: string): jsforce.Connection => {
  const conn = createSalesforceConnection();
  conn.initialize({
    accessToken,
    instanceUrl,
    version: '60.0',
  });
  return conn;
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