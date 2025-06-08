// frontend/src/components/feature-specific/connections/JiraConfigForm.tsx - COMPLETE WORKING VERSION
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle } from 'lucide-react';
import { useConnections } from '../../../contexts/ConnectionsContext';

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
  const { validatePlatformConfig } = useConnections();
  
  const [config, setConfig] = useState<JiraConfig>({
    name: '',
    domain: '',
    email: '',
    apiToken: '',
    projectKey: ''
  });
  
  const [showApiToken, setShowApiToken] = useState(false);
  const [errors, setErrors] = useState<Partial<JiraConfig>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [testResult, setTestResult] = useState<{valid: boolean, message: string} | null>(null);

  const handleChange = (field: keyof JiraConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset connection test when credentials change
    if (field === 'domain' || field === 'email' || field === 'apiToken' || field === 'projectKey') {
      setConnectionTested(false);
      setTestResult(null);
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
    setTestResult(null);
    
    try {
      console.log('🔄 Testing Jira connection with backend...');
      
      const result = await validatePlatformConfig('jira', {
        domain: config.domain.trim(),
        email: config.email.trim(),
        apiToken: config.apiToken.trim(),
        projectKey: config.projectKey.trim().toUpperCase()
      });
      
      console.log('✅ Backend validation result:', result);
      
      setTestResult(result);
      setConnectionTested(result.valid);
      
      if (!result.valid) {
        setErrors({ apiToken: result.message });
      } else {
        setErrors({});
      }
    } catch (error) {
      console.error('❌ Jira connection test failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to test connection. Please check your network and try again.';
      
      setErrors({ apiToken: errorMessage });
      setTestResult({ valid: false, message: errorMessage });
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

    // Submit the configuration
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
          Enter your Jira Cloud credentials to sync your project data
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
        <p className="mt-1 text-sm text-gray-500">
          The email address associated with your Jira account
        </p>
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
            How to create an API token
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
        <p className="mt-1 text-sm text-gray-500">
          The key of the Jira project you want to sync (e.g., PRISM, DEV, PROJ)
        </p>
      </div>

      {/* Test Connection */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Test Connection</h4>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        
        {testResult && (
          <div className={`flex items-center ${testResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              {testResult.valid ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
        
        {!testResult && (
          <div className="flex items-start text-gray-500">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              Please test your connection to verify the credentials work correctly.
            </span>
          </div>
        )}
      </div>

      {/* Jira Integration Details */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-2">Jira Integration Details</h5>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Syncs issues, epics, and sprint data from your project</p>
          <p>• Pulls team member assignments and story points</p>
          <p>• Retrieves workflow status and priority information</p>
          <p>• Updates automatically to reflect current project state</p>
        </div>
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