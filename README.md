# Salesforce License Utilization Inspector

A comprehensive React-based dashboard for analyzing Salesforce license utilization and user activity patterns. This application provides Salesforce administrators with detailed insights into license usage, user engagement, and cost optimization opportunities.

## 🔥 **Current Status: Frontend-Only with Mock Data**

This application currently runs as a **frontend-only demo** using mock data to simulate real Salesforce license analytics. It's designed to showcase the user interface and functionality that would be available when connected to actual Salesforce data.

## ✨ Features

### 📊 **Dashboard Analytics**
- **License Utilization Overview**: Visual breakdown of Full, Platform, and Community license usage
- **User Activity Metrics**: Track active, inactive, and engagement levels across your organization
- **Usage Trends**: Interactive charts showing user activity patterns over time
- **Top Objects Analysis**: Identify most-accessed Salesforce objects and their usage patterns

### 👥 **User Management**
- **Comprehensive User Table**: Sortable and filterable user data with pagination
- **Individual User Profiles**: Detailed activity breakdowns for each user
- **Usage Level Classification**: Automatic categorization (Heavy/Medium/Light/Inactive users)
- **Last Login Tracking**: Monitor user engagement and identify inactive accounts

### 🔍 **Advanced Filtering & Search**
- **Multi-criteria Filtering**: Filter by profile, role, license type, and usage level
- **Date Range Selection**: Analyze data over 90, 180, or 365-day periods
- **Real-time Search**: Instant user lookup and filtering
- **Saved Filter States**: Maintain filter preferences across sessions

### 📈 **Reporting & Export**
- **CSV Export**: Download filtered user data for external analysis
- **Usage Reports**: Generate comprehensive reports on license utilization
- **Object Interaction Reports**: Track which Salesforce objects are being used most
- **Cost Optimization Insights**: Identify potential savings opportunities

### 🔐 **Security & Authentication**
- **Salesforce OAuth 2.0**: Secure authentication using Salesforce identity
- **Session Management**: Automatic token refresh and session validation
- **Role-based Access**: Respects Salesforce user permissions
- **CSRF Protection**: Built-in security measures for safe authentication

### 💡 **Cost Optimization**
- **Unused License Detection**: Identify users with minimal activity
- **License Reallocation Suggestions**: Recommendations for optimizing license mix
- **Potential Savings Calculator**: Estimate cost reduction opportunities
- **Optimization Consultation CTA**: Direct path to professional optimization services

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Authentication**: Salesforce OAuth 2.0
- **State Management**: React Context API
- **HTTP Client**: Native Fetch API
- **Cookie Management**: js-cookie

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── AuthCallback.tsx  # OAuth callback handler
│   ├── Filters.tsx       # Advanced filtering interface
│   ├── Header.tsx        # Application header with actions
│   ├── LicenseUtilization.tsx  # License usage charts
│   ├── LoginPage.tsx     # Authentication interface
│   ├── OptimizationCTA.tsx     # Cost optimization call-to-action
│   ├── OverviewTiles.tsx       # Summary metric tiles
│   ├── ProtectedRoute.tsx      # Route protection wrapper
│   ├── TopObjects.tsx          # Most-used objects widget
│   ├── UsageChart.tsx          # User activity charts
│   └── UserTable.tsx           # Main user data table
├── contexts/            # React context providers
│   └── AuthContext.tsx  # Authentication state management
├── data/               # Mock data for demo purposes
│   ├── mockData.ts     # Sample user and org data
│   └── mockDetailData.ts # Detailed user activity data
├── hooks/              # Custom React hooks
│   └── useFilters.ts   # Filter state management
├── pages/              # Main application pages
│   ├── Dashboard.tsx   # Main dashboard view
│   ├── FilteredUserListPage.tsx # Filtered user results
│   ├── ObjectDetailPage.tsx     # Object usage details
│   └── UserDetailPage.tsx       # Individual user details
├── services/           # External service integrations
│   └── salesforceAuth.ts # Salesforce authentication service
├── types/              # TypeScript type definitions
│   ├── auth.ts         # Authentication-related types
│   └── index.ts        # Core application types
├── utils/              # Utility functions
│   └── export.ts       # Data export functionality
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd license-utilization
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup (Optional)**
   Create a `.env` file for Salesforce OAuth configuration:
   ```env
   VITE_SALESFORCE_CLIENT_ID=your_connected_app_client_id
   VITE_SALESFORCE_REDIRECT_URI=http://localhost:3000/auth/callback
   VITE_SALESFORCE_LOGIN_URL=https://login.salesforce.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open application**
   Navigate to `http://localhost:5173`

### 🐳 Docker Deployment

**Quick deployment with Docker Compose:**
```bash
docker-compose up --build -d
```

**Manual Docker build:**
```bash
# Build image
docker build -t sf-license-utilization .

# Run container
docker run -d -p 3000:80 --name sf-license-app sf-license-utilization
```

**Access application:** `http://localhost:3000`

## 📊 Current Mock Data

The application includes realistic sample data representing:

- **125 total users** across different license types
- **5 detailed user profiles** with comprehensive activity data
- **Multiple license types**: Full (100), Platform (50), Community (200)
- **Usage patterns**: Heavy (35), Medium (28), Light (35), Inactive (27)
- **Object interactions**: Account, Contact, Opportunity, Lead, Case data
- **Time-series data**: Activity trends over multiple periods

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy:vercel` - Deploy to Vercel
- `npm run deploy:netlify` - Deploy to Netlify
- `npm run deploy:gh-pages` - Deploy to GitHub Pages

## 🎯 Key User Journeys

### 1. **License Optimization Analysis**
- Login with Salesforce credentials
- View organization overview with license utilization metrics
- Identify unused or underutilized licenses
- Export user data for further analysis
- Use optimization CTA for professional consultation

### 2. **User Activity Investigation**
- Access user table with comprehensive activity data
- Apply filters to find specific user segments
- Click individual users for detailed activity breakdown
- Analyze object usage patterns and trends
- Export filtered results for reporting

### 3. **Object Usage Analysis**
- View top objects widget on dashboard
- Click objects to see detailed usage information
- Analyze which users interact with specific objects
- Track object usage trends over time
- Identify underutilized custom objects

### 4. **Cost Reduction Planning**
- Review inactive user list using filters
- Analyze users with minimal activity
- Calculate potential savings from license reallocation
- Export data for budget planning
- Use insights for license renewal negotiations

## 🎯 **NEW: Real Salesforce Integration Available!**

This application now includes a **complete backend integration** with real Salesforce data!

### 🚀 **Production-Ready Features**

#### **✅ Real Salesforce Data Integration**
- **Live User Data**: Sync user profiles, roles, and license information
- **Activity Tracking**: Process EventLogFile data for real usage metrics
- **License Analytics**: Real-time license utilization from your Salesforce org
- **OAuth 2.0 Security**: Secure authentication through Salesforce

#### **✅ Full-Stack Architecture**
- **Node.js/Express Backend**: Production-ready API server
- **PostgreSQL Database**: Robust data storage and analytics
- **Redis Caching**: High-performance session and data caching
- **Docker Deployment**: Container-ready deployment

#### **✅ Smart Fallback System**
- **Automatic Detection**: Detects if backend is available
- **Mock Data Mode**: Falls back to demo data when backend is unavailable
- **Seamless Experience**: Users can explore features regardless of backend status

### 🏗️ **Architecture Overview**

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   React Frontend    │───▶│   Express API       │───▶│  Salesforce Org     │
│                     │    │                     │    │                     │
│ • Dashboard         │    │ • OAuth Handler     │    │ • User Data         │
│ • Analytics         │    │ • Data Processor    │    │ • EventLogFiles     │
│ • User Management   │    │ • Background Jobs   │    │ • License Info      │
│ • Export Functions  │    │ • API Endpoints     │    │ • Activity Data     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                     │
                           ┌─────────────────────┐
                           │  PostgreSQL + Redis │
                           │                     │
                           │ • User Cache        │
                           │ • Activity Data     │
                           │ • License Analytics │
                           │ • Session Store     │
                           └─────────────────────┘
```

## 🚀 **Getting Started with Real Data**

### **Option 1: Full Integration Setup**

1. **Backend Setup** (see `/backend` folder):
   ```bash
   cd backend
   npm install
   npm run setup  # Creates .env and shows setup instructions
   ```

2. **Database Configuration**:
   - PostgreSQL: Create database and run schema
   - Redis: Start Redis server
   - Environment: Configure .env with your settings

3. **Salesforce Connected App**:
   - Create Connected App in Salesforce Setup
   - Configure OAuth with proper scopes
   - Add callback URL: `http://localhost:3001/api/auth/salesforce/callback`

4. **Start Full Stack**:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   npm run dev
   ```

### **Option 2: Demo Mode (No Setup Required)**

Simply run the frontend - it will automatically detect no backend and use mock data:

```bash
npm install
npm run dev
```

The app will display a "Demo Mode" banner and work with realistic sample data.

## 📊 **Real vs Mock Data**

| Feature | Mock Data Mode | Real Integration |
|---------|----------------|------------------|
| **User Data** | 5 sample users | Live Salesforce users |
| **License Info** | Static numbers | Real license utilization |
| **Activity Metrics** | Simulated data | EventLogFile processing |
| **Export** | Frontend CSV | Backend-generated reports |
| **Filtering** | Client-side only | Database-powered queries |
| **Real-time Updates** | Static | Live Salesforce sync |

## 🔮 **Advanced Features (With Backend)**

### **Real-Time Data Sync**
- **User Synchronization**: Automatic sync of Salesforce user data
- **License Monitoring**: Real-time license utilization tracking
- **Activity Processing**: EventLogFile data parsed for usage insights
- **Background Jobs**: Scheduled data refresh and processing

### **Production Analytics**
- **Usage Trends**: Historical analysis from real usage data
- **Cost Optimization**: Actual unused license identification
- **Compliance Reports**: Real user activity audit trails
- **Multi-Org Support**: Handle multiple Salesforce organizations

### **Enterprise Features**
- **API Rate Management**: Smart API usage and caching
- **Data Retention**: Configurable data retention policies
- **Audit Logging**: Comprehensive access and change logs
- **Security**: OAuth 2.0, JWT tokens, encrypted storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♀️ Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact your Salesforce administrator
- Review the documentation

---

**Built with ❤️ for Salesforce Administrators**

*Optimize your Salesforce investment with comprehensive license analytics and user activity insights.*