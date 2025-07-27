// frontend/src/components/feature-specific/connections/JiraConfigForm.tsx - COMPLETE SIMPLE VERSION
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const SHOW_DEBUG_PANEL = false; // Set to false to hide debug panel

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
}

const JiraConfigForm: React.FC<JiraConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<JiraConfig>({
    name: 'PRISM Jira Connection',
    domain: 'chongkelv.atlassian.net',
    email: 'chongkelv@gmail.com',
    apiToken: '',    
  });
  
  const [showApiToken, setShowApiToken] = useState(false);
  const [errors, setErrors] = useState<Partial<JiraConfig>>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const handleChange = (field: keyof JiraConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset test when credentials change
    if (field !== 'name' && testStatus !== 'idle') {
      setTestStatus('idle');
      setTestMessage('');
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');
    
    try {
      console.log('🔄 Testing Jira connection...');
      
      const response = await fetch('/api/jira-proxy/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: config.email.trim(),
          apiToken: config.apiToken.trim(),
          domain: config.domain.trim()    
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Connection failed`);
      }

      const result = await response.json();
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage('Connection successful! Ready to create connection.');
        setErrors({});
      } else {
        setTestStatus('error');
        setTestMessage(result.error || 'Connection test failed');
        setErrors({ apiToken: result.error || 'Connection test failed' });
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setTestStatus('error');
      setTestMessage(errorMessage);
      setErrors({ apiToken: errorMessage });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 JiraConfigForm: Form submitted');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    if (testStatus !== 'success') {
      console.log('❌ Connection not tested');
      setErrors({ apiToken: 'Please test the connection before submitting' });
      return;
    }

    console.log('✅ Creating connection...');
    
    // Create connection data
    const connectionData = {
      name: config.name.trim(),
      platform: 'jira' as const,
      config: {
        domain: config.domain.trim(),
        email: config.email.trim(),
        apiToken: config.apiToken.trim()        
      }
    };
    
    console.log('📦 Connection data prepared');
    
    // Call parent's onSubmit - this should NOT cause redirects
    onSubmit(connectionData);
  };

  const getTestStatusIcon = () => {
    switch (testStatus) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'testing':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const isFormValid = config.name && config.email && config.apiToken && config.domain;
  const canTest = isFormValid && testStatus !== 'testing';
  const canSubmit = testStatus === 'success' && !isSubmitting;

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
          Enter your Jira Cloud credentials (same approach as your PowerShell script)
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
          placeholder="PRISM Jira Connection"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
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

      {/* Test Connection */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Test Connection</h4>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!canTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        
        {/* Test Status */}
        {testMessage && (
          <div className={`flex items-center text-sm ${
            testStatus === 'success' ? 'text-green-600' : 
            testStatus === 'error' ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {getTestStatusIcon()}
            <span className="ml-2">{testMessage}</span>
          </div>
        )}
        
        {testStatus === 'idle' && (
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
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <RefreshCw size={14} className="animate-spin mr-2" />
              Creating...
            </div>
          ) : (
            'Create Connection'
          )}
        </button>
      </div>

      {/* Simple Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          Simple Process:
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>1. Fill in your Jira credentials (same as PowerShell script)</p>
          <p>2. Click "Test Connection" to verify it works</p>
          <p>3. Click "Create Connection" to save it</p>
          <p>4. No redirects, no complex flows - just works!</p>
        </div>
      </div>

      {/* Debug Info */}
      {SHOW_DEBUG_PANEL && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Debug Info:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Form Valid: {isFormValid ? 'Yes' : 'No'}</p>
            <p>Test Status: {testStatus}</p>
            <p>Can Test: {canTest ? 'Yes' : 'No'}</p>
            <p>Can Submit: {canSubmit ? 'Yes' : 'No'}</p>
            <p>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default JiraConfigForm;