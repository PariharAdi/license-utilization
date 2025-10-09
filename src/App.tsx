import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationWrapper } from './components/NotificationWrapper';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { AuthCallback } from './components/AuthCallback';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { UserDetailPage } from './pages/UserDetailPage';
import { ObjectDetailPage } from './pages/ObjectDetailPage';
import { FilteredUserListPage } from './pages/FilteredUserListPage';

function App() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    // The Dashboard component now handles its own refresh logic
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleExport = async () => {
    // Export is now handled by the Dashboard component through DashboardService
    console.log('Export initiated from header');
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <NotificationWrapper>
                <div className="min-h-screen bg-gray-50">
                  <Header
                    onRefresh={handleRefresh}
                    onExport={handleExport}
                    isLoading={isLoading}
                  />

                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Dashboard
                          onRefresh={handleRefresh}
                          isLoading={isLoading}
                        />
                      }
                    />
                    <Route path="/user/:userId" element={<UserDetailPage />} />
                    <Route path="/object/:objectName" element={<ObjectDetailPage />} />
                    <Route path="/users/:filterType" element={<FilteredUserListPage />} />
                  </Routes>
                </div>
              </NotificationWrapper>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
