import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback, isLoading, error } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        console.error('OAuth error:', errorParam);
        navigate('/login?error=' + encodeURIComponent(errorParam));
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state parameter');
        navigate('/login?error=' + encodeURIComponent('Invalid callback parameters'));
        return;
      }

      try {
        await handleCallback(code, state);
        navigate('/');
      } catch (error) {
        console.error('Callback processing failed:', error);
        navigate('/login?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl animate-pulse">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isLoading ? 'Completing Authentication...' : 'Authentication Error'}
        </h2>
        
        {isLoading ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Please wait while we complete your Salesforce authentication.
            </p>
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};