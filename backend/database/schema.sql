-- Create database (run this manually first)
-- CREATE DATABASE sf_license_util;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesforce_org_id VARCHAR(18) UNIQUE NOT NULL,
    org_name VARCHAR(255) NOT NULL,
    instance_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    salesforce_user_id VARCHAR(18) NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    profile_id VARCHAR(18),
    profile_name VARCHAR(255),
    user_role_id VARCHAR(18),
    user_role_name VARCHAR(255),
    license_type VARCHAR(100),
    user_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, salesforce_user_id)
);

-- User activities table (daily aggregates)
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    login_count INTEGER DEFAULT 0,
    api_requests INTEGER DEFAULT 0,
    report_runs INTEGER DEFAULT 0,
    dashboard_views INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    apex_executions INTEGER DEFAULT 0,
    bulk_api_requests INTEGER DEFAULT 0,
    object_touches JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- License summaries table (daily snapshots)
CREATE TABLE license_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    license_type VARCHAR(100) NOT NULL,
    total_licenses INTEGER NOT NULL,
    used_licenses INTEGER NOT NULL,
    available_licenses INTEGER GENERATED ALWAYS AS (total_licenses - used_licenses) STORED,
    utilization_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_licenses > 0 THEN (used_licenses::DECIMAL / total_licenses) * 100
            ELSE 0
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, summary_date, license_type)
);

-- Event log files tracking table
CREATE TABLE event_log_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    salesforce_log_file_id VARCHAR(18) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    log_date DATE NOT NULL,
    log_file_url TEXT,
    file_size_bytes BIGINT,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, salesforce_log_file_id)
);

-- Sessions table for OAuth tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    instance_url VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Object usage summary (for top objects analytics)
CREATE TABLE object_usage_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    object_name VARCHAR(255) NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    create_operations INTEGER DEFAULT 0,
    read_operations INTEGER DEFAULT 0,
    update_operations INTEGER DEFAULT 0,
    delete_operations INTEGER DEFAULT 0,
    view_operations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, summary_date, object_name)
);

-- Indexes for performance
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_salesforce_id ON users(salesforce_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_license_type ON users(license_type);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_org_id ON user_activities(org_id);
CREATE INDEX idx_user_activities_date ON user_activities(activity_date);

CREATE INDEX idx_license_summaries_org_id ON license_summaries(org_id);
CREATE INDEX idx_license_summaries_date ON license_summaries(summary_date);
CREATE INDEX idx_license_summaries_type ON license_summaries(license_type);

CREATE INDEX idx_event_log_files_org_id ON event_log_files(org_id);
CREATE INDEX idx_event_log_files_processed ON event_log_files(processed);
CREATE INDEX idx_event_log_files_date ON event_log_files(log_date);
CREATE INDEX idx_event_log_files_type ON event_log_files(event_type);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_object_usage_org_date ON object_usage_summaries(org_id, summary_date);
CREATE INDEX idx_object_usage_object_name ON object_usage_summaries(object_name);

-- GIN index for JSONB object_touches
CREATE INDEX idx_user_activities_object_touches ON user_activities USING GIN (object_touches);

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_activities_updated_at BEFORE UPDATE ON user_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample views for common queries
CREATE VIEW v_user_summary AS
SELECT
    u.id,
    u.salesforce_user_id,
    u.username,
    u.email,
    u.display_name,
    u.profile_name,
    u.user_role_name,
    u.license_type,
    u.is_active,
    u.last_login,
    o.org_name,
    o.salesforce_org_id,
    COALESCE(recent_activity.login_count, 0) as recent_login_count,
    COALESCE(recent_activity.total_activities, 0) as recent_total_activities
FROM users u
JOIN organizations o ON u.org_id = o.id
LEFT JOIN (
    SELECT
        user_id,
        SUM(login_count) as login_count,
        SUM(login_count + api_requests + report_runs + dashboard_views + page_views) as total_activities
    FROM user_activities
    WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
) recent_activity ON u.id = recent_activity.user_id;

CREATE VIEW v_license_utilization AS
SELECT
    ls.org_id,
    o.org_name,
    ls.license_type,
    ls.total_licenses,
    ls.used_licenses,
    ls.available_licenses,
    ls.utilization_percent,
    ls.summary_date
FROM license_summaries ls
JOIN organizations o ON ls.org_id = o.id
WHERE ls.summary_date = (
    SELECT MAX(summary_date)
    FROM license_summaries ls2
    WHERE ls2.org_id = ls.org_id AND ls2.license_type = ls.license_type
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium',
    channels JSONB NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization webhooks table
CREATE TABLE organization_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    webhook_urls JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add notification preferences and email notifications to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_org_id ON notifications(org_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- Indexes for webhooks
CREATE INDEX idx_organization_webhooks_org_id ON organization_webhooks(org_id);
CREATE INDEX idx_organization_webhooks_active ON organization_webhooks(is_active);

-- GIN indexes for JSONB columns
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);
CREATE INDEX idx_notifications_channels ON notifications USING GIN (channels);
CREATE INDEX idx_organization_webhooks_urls ON organization_webhooks USING GIN (webhook_urls);
CREATE INDEX idx_users_notification_prefs ON users USING GIN (notification_preferences);

-- Triggers for updated_at on webhooks
CREATE TRIGGER update_organization_webhooks_updated_at BEFORE UPDATE ON organization_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- INSERT INTO organizations (salesforce_org_id, org_name, instance_url)
-- VALUES ('00D000000000001EAA', 'Sample Org', 'https://sample.my.salesforce.com');

COMMENT ON TABLE organizations IS 'Salesforce organizations connected to the application';
COMMENT ON TABLE users IS 'Salesforce users with license and activity information';
COMMENT ON TABLE user_activities IS 'Daily aggregated user activity data';
COMMENT ON TABLE license_summaries IS 'Daily snapshots of license utilization';
COMMENT ON TABLE event_log_files IS 'Tracking table for Salesforce event log file processing';
COMMENT ON TABLE user_sessions IS 'OAuth session management for authenticated users';
COMMENT ON TABLE object_usage_summaries IS 'Daily aggregated Salesforce object usage statistics';
COMMENT ON TABLE notifications IS 'Real-time notifications for users and organizations';
COMMENT ON TABLE organization_webhooks IS 'Webhook URLs for organization-level notifications';