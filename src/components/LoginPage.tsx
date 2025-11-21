import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Shield,
  Users,
  TrendingUp,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorParam = searchParams.get("error");

  // Add state for form
  const [credentials, setCredentials] = useState({
    username: "sparsh.sharma@cunning-impala-mz8tau.com",
    password: "kkkk",
  });

  useEffect(() => {
    if (errorParam) {
      clearError();
    }
  }, [errorParam, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Call login with credentials
      await login(credentials.username, credentials.password);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: "License Analytics",
      description:
        "Deep insights into user activity and license utilization patterns",
    },
    {
      icon: Users,
      title: "User Management",
      description:
        "Track individual user engagement and identify optimization opportunities",
    },
    {
      icon: TrendingUp,
      title: "Usage Trends",
      description:
        "Monitor usage patterns over time with detailed reporting capabilities",
    },
    {
      icon: Zap,
      title: "Cost Optimization",
      description:
        "Identify unused licenses and potential cost savings opportunities",
    },
  ];

  const benefits = [
    "Reduce license costs by up to 30%",
    "Identify underutilized users",
    "Optimize license mix and allocation",
    "Generate detailed usage reports",
    "Track object-level interactions",
    "Monitor login patterns and trends",
  ];

  // Add this inside your existing return statement,
  // Replace the existing button with this form
  const loginForm = (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Username"
          value={credentials.username}
          onChange={(e) =>
            setCredentials({ ...credentials, username: e.target.value })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <input
          type="password"
          placeholder="Password"
          value={credentials.password}
          onChange={(e) =>
            setCredentials({ ...credentials, password: e.target.value })
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Logging in...
          </>
        ) : (
          <>
            <Shield className="w-5 h-5 mr-3" />
            Sign in
          </>
        )}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex min-h-screen">
        {/* Left Panel - Branding and Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white">
          <div className="flex flex-col justify-center max-w-lg mx-auto">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    License Utilization Inspector
                  </h1>
                  <p className="text-blue-100">Salesforce Admin Utility</p>
                </div>
              </div>

              <p className="text-xl text-blue-100 leading-relaxed">
                Optimize your Salesforce investment with comprehensive license
                analytics and user activity insights.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Key Benefits
              </h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="text-blue-100 text-sm flex items-center"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full mr-3 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">LUI</h1>
                  <p className="text-gray-600 text-sm">
                    License Utilization Inspector
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-600">
                  Sign in with your Salesforce admin account to access your
                  organization's license analytics
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {loginForm}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Secure authentication powered by Salesforce OAuth 2.0
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-4">
                    Trusted by Salesforce administrators worldwide
                  </p>
                  <div className="flex items-center justify-center space-x-6 text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs">Secure</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Verified</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs">Fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Need help? Contact your Salesforce administrator or{" "}
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  view documentation
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
