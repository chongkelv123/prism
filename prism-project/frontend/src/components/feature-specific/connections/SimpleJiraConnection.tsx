// frontend/src/components/feature-specific/connections/SimpleJiraConnection.tsx
import React, { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { simpleJiraService, type JiraCredentials, type JiraTestStep } from '../../../services/simpleJira.service';

const SimpleJiraConnection: React.FC = () => {
  const [credentials, setCredentials] = useState<JiraCredentials & { connectionName: string }>({
    email: 'chongkelv@gmail.com',
    apiToken: '',
    domain: 'chongkelv.atlassian.net',
    projectKey: 'PRISM',
    connectionName: 'PRISM Jira Connection'
  });

  const [showApiToken, setShowApiToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<JiraTestStep[]>([]);
  const [connectionSuccessful, setConnectionSuccessful] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof typeof credentials, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset test results when credentials change
    if (field !== 'connectionName') {
      setTestResults([]);
      setConnectionSuccessful(false);
      setError(null);
    }
  };

  const testConnection = async () => {
    if (!credentials.email || !credentials.apiToken || !credentials.domain || !credentials.projectKey) {
      setError('Please fill in all fields');
      return;
    }

    setIsTesting(true);
    setError(null);
    setConnectionSuccessful(false);
    setTestResults([]);

    try {
      const result = await simpleJiraService.testConnection({
        email: credentials.email,
        apiToken: credentials.apiToken,
        domain: credentials.domain,
        projectKey: credentials.projectKey
      });

      setTestResults(result.steps);
      setConnectionSuccessful(result.success);
      
      if (!result.success && result.error) {
        setError(result.error);
      }

    } catch (error: any) {
      console.error('Connection test failed:', error);
      setError(error.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const saveConnection = async () => {
    setIsSaving(true);
    try {
      const result = await simpleJiraService.saveConnection(credentials.connectionName, {
        email: credentials.email,
        apiToken: credentials.apiToken,
        domain: credentials.domain,
        projectKey: credentials.projectKey
      });

      if (result.success) {
        alert(`Connection '${credentials.connectionName}' saved successfully!`);
      } else {
        alert(`Failed to save connection: ${result.error || result.message}`);
      }
    } catch (error: any) {
      alert(`Failed to save connection: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: JiraTestStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'pending':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 border border-gray-300 rounded-full" />;
    }
  };

  const isFormValid = credentials.email && credentials.apiToken && credentials.domain && credentials.projectKey;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Simple Jira Connection
        </h2>
        <p className="text-gray-600">
          Direct connection using your Jira credentials (same approach as working PowerShell script)
        </p>
      </div>

      <div className="space-y-4">
        {/* Connection Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connection Name
          </label>
          <input
            type="text"
            value={credentials.connectionName}
            onChange={(e) => handleInputChange('connectionName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., PRISM Jira Connection"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={credentials.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="chongkelv@gmail.com"
          />
        </div>

        {/* API Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Token
          </label>
          <div className="relative">
            <input
              type={showApiToken ? 'text' : 'password'}
              value={credentials.apiToken}
              onChange={(e) => handleInputChange('apiToken', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Jira API token"
            />
            <button
              type="button"
              onClick={() => setShowApiToken(!showApiToken)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showApiToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="mt-1 flex items-center text-sm text-blue-600">
            <ExternalLink size={12} className="mr-1" />
            <a 
              href="https://id.atlassian.com/manage-profile/security/api-tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Create API Token
            </a>
          </div>
        </div>

        {/* Jira Domain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jira Domain
          </label>
          <input
            type="text"
            value={credentials.domain}
            onChange={(e) => handleInputChange('domain', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="chongkelv.atlassian.net"
          />
        </div>

        {/* Project Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Key
          </label>
          <input
            type="text"
            value={credentials.projectKey}
            onChange={(e) => handleInputChange('projectKey', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="PRISM"
          />
        </div>
      </div>

      {/* Test Connection Button */}
      <div className="mt-6">
        <button
          onClick={testConnection}
          disabled={isTesting || !isFormValid}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {isTesting ? (
            <div className="flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin mr-2" />
              Testing Connection...
            </div>
          ) : (
            'Test Connection'
          )}
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-gray-900">Connection Test Results:</h3>
          {testResults.map((test, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{test.step}</div>
                <div className={`text-sm ${test.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                  {test.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={20} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Connection Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              
              {/* CORS Notice */}
              {(error.includes('CORS') || error.includes('fetch')) && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <strong>Note:</strong> CORS errors are expected when testing from localhost. 
                  This connection will work in production through your backend proxy.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success and Save Connection */}
      {connectionSuccessful && (
        <div className="mt-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <div className="flex items-start">
              <CheckCircle size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Connection Successful!</h4>
                <p className="text-sm text-green-700 mt-1">
                  All tests passed. Your Jira connection is ready for use.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={saveConnection}
            disabled={isSaving}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isSaving ? (
              <div className="flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Saving Connection...
              </div>
            ) : (
              'Save Connection'
            )}
          </button>
        </div>
      )}

      {/* How This Works */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">How This Works:</h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• Uses Basic Auth (same as your working PowerShell script)</p>
          <p>• Tests /rest/api/3/myself (connection verification)</p>
          <p>• Tests /rest/api/3/project/PRISM (project access)</p>
          <p>• Tests /rest/api/3/search (data retrieval)</p>
          <p>• Direct API calls - no complex backend routing</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleJiraConnection;