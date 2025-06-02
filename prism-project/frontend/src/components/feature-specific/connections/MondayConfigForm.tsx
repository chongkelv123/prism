// frontend/src/components/feature-specific/connections/MondayConfigForm.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle } from 'lucide-react';

interface MondayConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface MondayConfig {
  name: string;
  apiKey: string;
  workspaceId: string;
  selectedBoards: string[];
}

const MondayConfigForm: React.FC<MondayConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<MondayConfig>({
    name: '',
    apiKey: '',
    workspaceId: '',
    selectedBoards: []
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Partial<MondayConfig>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  const handleChange = (field: keyof MondayConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset connection test when credentials change
    if (field === 'apiKey' || field === 'workspaceId') {
      setConnectionTested(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<MondayConfig> = {};
    
    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    
    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }
    
    if (!config.workspaceId.trim()) {
      newErrors.workspaceId = 'Workspace ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!config.apiKey || !config.workspaceId) {
      setErrors({
        apiKey: !config.apiKey ? 'API key is required for testing' : undefined,
        workspaceId: !config.workspaceId ? 'Workspace ID is required for testing' : undefined
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Simulate API test call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      setConnectionTested(true);
      setErrors({});
    } catch (error) {
      setErrors({ apiKey: 'Failed to connect. Please check your credentials.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!connectionTested) {
      setErrors({ apiKey: 'Please test the connection before submitting' });
      return;
    }

    onSubmit({
      ...config,
      platform: 'monday',
      projectCount: 3 // Mock project count
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to Monday.com
        </h3>
        <p className="text-gray-600">
          Enter your Monday.com API credentials to sync your workspace data
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
          placeholder="e.g., Monday.com Main Workspace"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="Enter your Monday.com API key"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.apiKey ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.apiKey && (
          <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
        )}
        <div className="mt-2 flex items-center text-sm text-blue-600">
          <ExternalLink size={14} className="mr-1" />
          <a 
            href="https://support.monday.com/hc/en-us/articles/360005144659-Monday-com-API" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            How to get your API key
          </a>
        </div>
      </div>

      {/* Workspace ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Workspace ID
        </label>
        <input
          type="text"
          value={config.workspaceId}
          onChange={(e) => handleChange('workspaceId', e.target.value)}
          placeholder="Enter your workspace ID"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.workspaceId ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.workspaceId && (
          <p className="mt-1 text-sm text-red-600">{errors.workspaceId}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          You can find this in your Monday.com workspace URL
        </p>
      </div>

      {/* Test Connection */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Test Connection</h4>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !config.apiKey || !config.workspaceId}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        
        {connectionTested && (
          <div className="flex items-center text-green-600">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Connection successful!</span>
          </div>
        )}
        
        {!connectionTested && (
          <div className="flex items-start text-gray-500">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
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
          {isSubmitting ? 'Connecting...' : 'Create Connection'}
        </button>
      </div>
    </form>
  );
};

export default MondayConfigForm;