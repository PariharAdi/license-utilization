export interface SalesforceUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  organizationId: string;
  organizationName: string;
  profileId: string;
  profileName: string;
  userType: string;
  isActive: boolean;
  lastLoginDate: string;
  photoUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SalesforceUser | null;
  accessToken: string | null;
  instanceUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceUserInfo {
  user_id: string;
  organization_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  nick_name: string;
  profile: {
    name: string;
  };
  organization: {
    name: string;
  };
  photos: {
    picture: string;
    thumbnail: string;
  };
  active: boolean;
  user_type: string;
  language: string;
  locale: string;
  utcOffset: number;
  last_modified_date: string;
}