# Salesforce License Utilization Backend

Node.js/Express backend API for the Salesforce License Utilization application with real Salesforce integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run setup script
npm run setup

# Start development server
npm run dev
```

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Salesforce org with admin access

## 🛠️ Setup Instructions

### 1. Database Setup

**PostgreSQL:**
```bash
# Create database
createdb sf_license_util

# Run schema
psql -d sf_license_util -f database/schema.sql
```

**Redis:**
```bash
# Start Redis server
redis-server
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/sf_license_util
REDIS_URL=redis://localhost:6379

# Salesforce Configuration
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
SALESFORCE_REDIRECT_URI=http://localhost:3001/api/auth/salesforce/callback
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-in-production
```

### 3. Salesforce Connected App Setup

1. **Navigate to Salesforce Setup**
   - Go to App Manager
   - Click "New Connected App"

2. **Basic Information**
   - Connected App Name: `SF License Utilization`
   - API Name: `SF_License_Utilization`
   - Contact Email: Your email

3. **API (Enable OAuth Settings)**
   - ✅ Enable OAuth Settings
   - Callback URL: `http://localhost:3001/api/auth/salesforce/callback`
   - Selected OAuth Scopes:
     - `Access your basic information (id, profile, email, address, phone)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
     - `Access and manage your data (api)`
     - `Allow access to your unique identifier (openid)`

4. **After Creation**
   - Note the **Consumer Key** (Client ID)
   - Note the **Consumer Secret** (Client Secret)
   - Update your `.env` file with these values

### 4. Required Salesforce Permissions

The connected user must have these permissions:
- ✅ **View Event Log Files** - Access EventLogFile data
- ✅ **View All Data** - Read user and license data
- ✅ **API Enabled** - Make API calls
- ✅ **Run Reports** - Access report metadata
- ✅ **Manage Users** - User management data

## 📚 API Documentation

### Authentication Endpoints

```
GET  /api/auth/salesforce              - Initiate OAuth flow
GET  /api/auth/salesforce/callback     - OAuth callback
GET  /api/auth/me                      - Get current user info
GET  /api/auth/status                  - Check auth status
POST /api/auth/refresh                 - Refresh auth token
POST /api/auth/logout                  - Logout user
```

### User Management Endpoints

```
GET  /api/users                       - Get all users (paginated)
GET  /api/users/summary               - Get user counts summary
GET  /api/users/filters               - Get filter options
GET  /api/users/export                - Export users to CSV
GET  /api/users/:userId               - Get specific user
```

### Analytics Endpoints

```
GET  /api/analytics/overview          - Organization overview
GET  /api/analytics/licenses          - License utilization data
GET  /api/analytics/objects           - Object usage analytics
GET  /api/analytics/users/:userId/activity - User activity details
```

## 🏗️ Architecture

```
├── src/
│   ├── config/           # Database and Salesforce configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Authentication and validation
│   ├── models/          # Database models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic and Salesforce integration
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── database/            # SQL schema and migrations
└── scripts/            # Setup and utility scripts
```

## 📊 Data Flow

1. **Authentication**: User authenticates via Salesforce OAuth 2.0
2. **Data Sync**: Backend syncs user and license data from Salesforce
3. **Event Processing**: EventLogFile data is processed for activity tracking
4. **Analytics**: Aggregated data provides insights and reports
5. **API**: Frontend consumes RESTful API endpoints

## 🔄 Data Synchronization

The backend automatically syncs data from Salesforce:

- **Users**: Profile, role, license type, activity status
- **Licenses**: Total, used, and available license counts
- **Activity**: Event log data processed into user activity metrics
- **Objects**: Usage statistics for Salesforce objects

## 🛡️ Security Features

- **OAuth 2.0**: Secure Salesforce authentication
- **JWT Tokens**: Stateless authentication for frontend
- **Rate Limiting**: API request throttling
- **CORS**: Cross-origin request security
- **Helmet**: Security headers
- **HTTPS**: SSL/TLS encryption (production)

## 📈 Performance Optimization

- **Connection Pooling**: PostgreSQL connection pooling
- **Redis Caching**: Session and token caching
- **Pagination**: Large dataset pagination
- **Background Jobs**: Async data processing
- **Database Indexing**: Optimized queries

## 🧪 Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run setup script
npm run setup
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment | No (default: development) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `SALESFORCE_CLIENT_ID` | Connected App Client ID | Yes |
| `SALESFORCE_CLIENT_SECRET` | Connected App Client Secret | Yes |
| `SALESFORCE_REDIRECT_URI` | OAuth callback URL | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `SESSION_SECRET` | Session signing secret | Yes |

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t sf-license-backend .

# Run with environment
docker run -d -p 3001:3001 --env-file .env sf-license-backend
```

### Production Considerations

- Use environment variables for all secrets
- Enable HTTPS/SSL certificates
- Configure database connection pooling
- Set up monitoring and logging
- Implement health checks
- Use reverse proxy (nginx)

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists and schema is applied

2. **Redis Connection Failed**
   - Verify Redis server is running
   - Check REDIS_URL configuration

3. **Salesforce Authentication Failed**
   - Verify Connected App configuration
   - Check callback URL matches exactly
   - Ensure user has required permissions

4. **Event Log Processing Issues**
   - Verify user has "View Event Log Files" permission
   - Check if Event Monitoring is enabled in org

## 📞 Support

- Create an issue on GitHub
- Check the logs for detailed error messages
- Verify Salesforce API limits and permissions

---

**Built with ❤️ for Salesforce Administrators**