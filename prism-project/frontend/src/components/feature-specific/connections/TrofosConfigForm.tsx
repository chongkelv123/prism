// frontend/src/components/feature-specific/connections/TrofosConfigForm.tsx (FIXED)
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle } from 'lucide-react';
import { useConnections } from '../../../contexts/ConnectionsContext';

interface TrofosConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface TrofosConfig {
  name: string;
  serverUrl: string;
  apiKey: string;
  projectId: string;
}

interface TrofosProject {
  id: string;
  name: string;
}

const TrofosConfigForm: React.FC<TrofosConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const { validatePlatformConfig } = useConnections();
  const [config, setConfig] = useState<TrofosConfig>({
    name: '',
    serverUrl: 'https://trofos-production.comp.nus.edu.sg/api/external',
    apiKey: '',
    projectId: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Partial<TrofosConfig>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<TrofosProject[]>([]);
  const [testResult, setTestResult] = useState<{ valid: boolean, message: string } | null>(null);

  const handleChange = (field: keyof TrofosConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset connection test when credentials change
    if (field === 'serverUrl' || field === 'apiKey') {
      setConnectionTested(false);
      setAvailableProjects([]);
      setTestResult(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TrofosConfig> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    if (!config.serverUrl.trim()) {
      newErrors.serverUrl = 'TROFOS server URL is required';
    }

    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (!config.projectId.trim()) {
      newErrors.projectId = 'Project ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!config.serverUrl || !config.apiKey) {
      setErrors({
        serverUrl: !config.serverUrl ? 'Server URL is required for testing' : undefined,
        apiKey: !config.apiKey ? 'API key is required for testing' : undefined
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      console.log('🔄 Testing TROFOS connection with backend...');

      // Call real backend API to validate TROFOS configuration
      const result = await validatePlatformConfig('trofos', {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        projectId: config.projectId || 'test' // Use a test project ID for validation
      });

      console.log('✅ Backend validation result:', result);

      setTestResult(result);
      setConnectionTested(result.valid);

      if (result.valid) {
        setConnectionTested(true);
        setErrors({});
        setTestResult(result);

        // Clear projects - user will manually enter project ID
        setAvailableProjects([]);

        console.log('✅ TROFOS connection test successful');
      } else {
        setConnectionTested(false);
        setErrors({ apiKey: result.message });
        setTestResult(result);
        setAvailableProjects([]);
      }
    } catch (error) {
      console.error('❌ TROFOS connection test failed:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to connect. Please check your credentials and server URL.';

      setErrors({ apiKey: errorMessage });
      setTestResult({ valid: false, message: errorMessage });
      setConnectionTested(false);
      setAvailableProjects([]);
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

    const selectedProject = availableProjects.find(p => p.id === config.projectId);

    // Submit the real configuration to backend
    onSubmit({
      name: config.name,
      platform: 'trofos',
      config: {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        projectId: config.projectId
      },
      projectName: selectedProject?.name || 'Unknown Project',
      projectCount: 1
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📈</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to TROFOS
        </h3>
        <p className="text-gray-600">
          Enter your TROFOS server details to sync your project data
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
          placeholder="e.g., TROFOS Production Server"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Server URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TROFOS Server URL
        </label>
        <input
          type="url"
          value={config.serverUrl}
          onChange={(e) => handleChange('serverUrl', e.target.value)}
          placeholder="https://your-trofos-server.com"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.serverUrl ? 'border-red-500' : 'border-gray-300'
            }`}
        />
        {errors.serverUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.serverUrl}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          The base URL of your TROFOS server instance
        </p>
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
            placeholder="Enter your TROFOS API key"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.apiKey ? 'border-red-500' : 'border-gray-300'
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
        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <div className="text-blue-500 mr-2 mt-0.5">
              <ExternalLink size={14} />
            </div>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">How to get your TROFOS API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Log in to your TROFOS account</li>
                <li>Go to Settings → API Access</li>
                <li>Generate a new API key for external integrations</li>
                <li>Copy the key and paste it here</li>
              </ol>
              <div className="mt-2">
                <a
                  href="https://trofos-production.comp.nus.edu.sg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  → Open TROFOS to get your API key
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Connection & Load Projects */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Test Connection & Load Projects</h4>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !config.serverUrl || !config.apiKey}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResult && testResult.valid && availableProjects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Connection successful! Found {availableProjects.length} project(s)</span>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={config.projectId}
                onChange={(e) => handleChange('projectId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.projectId ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Select a project...</option>
                {availableProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
              )}
            </div>
          </div>
        )}

        {testResult && !testResult.valid && (
          <div className="flex items-center text-red-600">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        {!testResult && (
          <div className="flex items-start text-gray-500">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              Please test your connection to verify the credentials and load available projects.
            </span>
          </div>
        )}
      </div>

      {/* TROFOS API Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-2">TROFOS Integration Details</h5>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Syncs project data, backlogs, and sprint information</p>
          <p>• Pulls resource allocation and team member assignments</p>
          <p>• Retrieves project metrics and progress tracking</p>
          <p>• Updates automatically to reflect current project status</p>
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
          disabled={isSubmitting || !connectionTested || !config.projectId}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Connecting...' : 'Create Connection'}
        </button>
      </div>
    </form>
  );
};

export default TrofosConfigForm;