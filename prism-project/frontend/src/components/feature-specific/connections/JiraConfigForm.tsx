// frontend/src/components/feature-specific/connections/JiraConfigForm.tsx - UPDATED TO USE SIMPLE CONNECTION
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { simpleJiraService, type JiraCredentials, type JiraTestStep } from '../../../services/simpleJira.service';

interface JiraConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface JiraConfig {
  name: string;
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

const JiraConfigForm: React.FC<JiraConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<JiraConfig>({
    name: '',
    domain: 'chongkelv.atlassian.net',
    email: 'chongkelv@gmail.com',
    apiToken: '',
    projectKey: 'PRISM'
  });
  
  const [showApiToken, setShowApiToken] = useState(false);
  const [errors, setErrors] = useState<Partial<JiraConfig>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [testResults, setTestResults] = useState<JiraTestStep[]>([]);
  const [testError, setTestError] = useState<string | null>(null);

  const handleChange = (field: keyof JiraConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset connection test when credentials change
    if (field === 'domain' || field === 'email' || field === 'apiToken' || field === 'projectKey') {
      setConnectionTested(false);
      setTestResults([]);
      setTestError(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<JiraConfig> = {};
    
    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    
    if (!config.domain.trim()) {
      newErrors.domain = 'Jira domain is required';
    }
    
    if (!config.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!config.apiToken.trim()) {
      newErrors.apiToken = 'API token is required';
    }
    
    if (!config.projectKey.trim()) {
      newErrors.projectKey = 'Project key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setIsTestingConnection(true);
    setTestError(null);
    setTestResults([]);
    
    try {
      console.log('🔄 Testing Jira connection using simple service...');
      
      const result = await simpleJiraService.testConnection({
        email: config.email.trim(),
        apiToken: config.apiToken.trim(),
        domain: config.domain.trim(),
        projectKey: config.projectKey.trim().toUpperCase()
      });
      
      console.log('✅ Simple Jira service result:', result);
      
      setTestResults(result.steps);
      setConnectionTested(result.success);
      
      if (!result.success && result.error) {
        setTestError(result.error);
        setErrors({ apiToken: result.error });
      } else {
        setErrors({});
      }
    } catch (error) {
      console.error('❌ Jira connection test failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to test connection. Please check your network and try again.';
      
      setErrors({ apiToken: errorMessage });
      setTestError(errorMessage);
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!connectionTested) {
      setErrors({ apiToken: 'Please test the connection before submitting' });
      return;
    }

    // Submit the configuration using the same format as before
    onSubmit({
      name: config.name.trim(),
      platform: 'jira',
      config: {
        domain: config.domain.trim(),
        email: config.email.trim(),
        apiToken: config.apiToken.trim(),
        projectKey: config.projectKey.trim().toUpperCase()
      }
    });
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

  const isFormValid = config.name && config.email && config.apiToken && config.domain && config.projectKey;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔄</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to Jira
        </h3>
        <p className="text-gray-600">
          Enter your Jira Cloud credentials (using simple, reliable connection method)
        </p>
      </div>

      {/* Connection Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Connection Name
        </label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Jira PRISM Project"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Jira Domain */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jira Domain
        </label>
        <input
          type="text"
          value={config.domain}
          onChange={(e) => handleChange('domain', e.target.value)}
          placeholder="chongkelv.atlassian.net"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.domain ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.domain && (
          <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Your Jira Cloud domain (without https://)
        </p>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          value={config.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="chongkelv@gmail.com"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* API Token */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API Token
        </label>
        <div className="relative">
          <input
            type={showApiToken ? 'text' : 'password'}
            value={config.apiToken}
            onChange={(e) => handleChange('apiToken', e.target.value)}
            placeholder="Enter your Jira API token"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.apiToken ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowApiToken(!showApiToken)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            {showApiToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.apiToken && (
          <p className="mt-1 text-sm text-red-600">{errors.apiToken}</p>
        )}
        <div className="mt-2 flex items-center text-sm text-blue-600">
          <ExternalLink size={14} className="mr-1" />
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

      {/* Project Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Key
        </label>
        <input
          type="text"
          value={config.projectKey}
          onChange={(e) => handleChange('projectKey', e.target.value.toUpperCase())}
          placeholder="PRISM"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.projectKey ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.projectKey && (
          <p className="mt-1 text-sm text-red-600">{errors.projectKey}</p>
        )}
      </div>

      {/* Test Connection */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Test Connection</h4>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !isFormValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingConnection ? (
              <div className="flex items-center">
                <RefreshCw size={14} className="animate-spin mr-2" />
                Testing...
              </div>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
        
        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2 mb-3">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{test.step}</div>
                  <div className={`text-xs ${test.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                    {test.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {testError && (
          <div className="flex items-center text-red-600 text-sm mb-3">
            <AlertCircle size={14} className="mr-2" />
            <span>{testError}</span>
          </div>
        )}
        
        {connectionTested && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle size={14} className="mr-2" />
            <span>Connection successful! Ready to create connection.</span>
          </div>
        )}
        
        {!testResults.length && !testError && (
          <div className="flex items-start text-gray-500 text-sm">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Please test your connection to verify the credentials work correctly.
            </span>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting || !connectionTested}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Connection'}
        </button>
      </div>
    </form>
  );
};

export default JiraConfigForm;