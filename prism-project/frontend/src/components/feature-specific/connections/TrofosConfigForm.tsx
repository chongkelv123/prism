// File: frontend/src/components/feature-specific/connections/TrofosConfigForm.tsx

import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface TrofosConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface TrofosConfig {
  name: string;
  serverUrl: string;
  apiKey: string;
  selectedProjectId: string;
}

interface TrofosProject {
  id: string;
  name: string;
  description?: string;
}

const TrofosConfigForm: React.FC<TrofosConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<TrofosConfig>({
    name: 'PRISM TROFOS Connection',
    serverUrl: 'https://trofos-production.comp.nus.edu.sg/api/external',
    apiKey: '',
    selectedProjectId: ''
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Partial<TrofosConfig>>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<TrofosProject[]>([]);

  const handleChange = (field: keyof TrofosConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset test when credentials change
    if (field !== 'name' && field !== 'selectedProjectId' && testStatus !== 'idle') {
      setTestStatus('idle');
      setTestMessage('');
      setAvailableProjects([]);
      setConfig(prev => ({ ...prev, selectedProjectId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TrofosConfig> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    if (!config.serverUrl.trim()) {
      newErrors.serverUrl = 'TROFOS server URL is required';
    } else if (!config.serverUrl.startsWith('http')) {
      newErrors.serverUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }

    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    if (testStatus === 'success' && !config.selectedProjectId.trim()) {
      newErrors.selectedProjectId = 'Project selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testTrofosConnection = async () => {
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock project list (replace with actual API response)
      const mockProjects: TrofosProject[] = [
        { id: '127', name: 'CS4218 2420 Team 40', description: 'Software Testing Project' },
        { id: '172', name: 'Demo Project', description: 'TROFOS Demo Project' },
        { id: '245', name: 'Mobile App Development', description: 'React Native Project' }
      ];

      return { projects: mockProjects };
    } catch (error) {
      throw new Error('Failed to connect to TROFOS server');
    }
  };

  const handleTestConnection = async () => {
    if (!config.serverUrl || !config.apiKey) {
      setErrors({
        serverUrl: !config.serverUrl ? 'Server URL is required for testing' : undefined,
        apiKey: !config.apiKey ? 'API key is required for testing' : undefined
      });
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');
    setAvailableProjects([]);

    try {
      const result = await testTrofosConnection();
      
      setTestStatus('success');
      setTestMessage(`Connection successful! Found ${result.projects.length} project(s).`);
      setAvailableProjects(result.projects);
      setErrors({});

    } catch (error) {
      console.error('❌ TROFOS connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setTestStatus('error');
      setTestMessage(errorMessage);
      setErrors({ apiKey: errorMessage });
      setAvailableProjects([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (testStatus !== 'success') {
      setErrors({ apiKey: 'Please test the connection before submitting' });
      return;
    }

    const selectedProject = availableProjects.find(p => p.id === config.selectedProjectId);

    const connectionData = {
      name: config.name.trim(),
      platform: 'trofos' as const,
      config: {
        serverUrl: config.serverUrl.trim(),
        apiKey: config.apiKey.trim(),
        projectId: config.selectedProjectId.trim()
      },
      projectName: selectedProject?.name || 'Unknown Project',
      projectCount: 1
    };

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

  const isConnectionValid = config.name && config.serverUrl && config.apiKey;
  const canTest = config.serverUrl && config.apiKey && testStatus !== 'testing';
  const canSubmit = testStatus === 'success' && isConnectionValid && config.selectedProjectId && !isSubmitting;

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
          Enter your TROFOS credentials to sync project data with PRISM
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
          placeholder="PRISM TROFOS Connection"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* TROFOS Server URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TROFOS Server URL
        </label>
        <input
          type="url"
          value={config.serverUrl}
          onChange={(e) => handleChange('serverUrl', e.target.value)}
          placeholder="https://trofos-production.comp.nus.edu.sg/api/external"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.serverUrl ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <p className="mt-1 text-sm text-gray-500">
          The base URL of your TROFOS server instance
        </p>
        {errors.serverUrl && <p className="mt-1 text-sm text-red-600">{errors.serverUrl}</p>}
      </div>

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            API Key
          </label>
          <a
            href="https://trofos-production.comp.nus.edu.sg/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            Get your API key from TROFOS Settings
            <ExternalLink size={12} className="ml-1" />
          </a>
        </div>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="Enter your TROFOS API key"
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.apiKey ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.apiKey && <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>}
      </div>

      {/* Connection Test */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!canTest}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {getTestStatusIcon()}
            <span className="ml-2">
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </span>
          </button>
        </div>

        {testMessage && (
          <p className={`text-sm ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {testMessage}
          </p>
        )}
      </div>

      {/* Project Selection - Only show after successful connection test */}
      {testStatus === 'success' && availableProjects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            value={config.selectedProjectId}
            onChange={(e) => handleChange('selectedProjectId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.selectedProjectId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a project...</option>
            {availableProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} (ID: {project.id})
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Select the TROFOS project you want to connect to
          </p>
          {errors.selectedProjectId && <p className="mt-1 text-sm text-red-600">{errors.selectedProjectId}</p>}
        </div>
      )}

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

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          Simple Process:
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>1. Fill in your TROFOS server URL and API key</p>
          <p>2. Click "Test Connection" to verify it works</p>
          <p>3. Select a project from the loaded list</p>
          <p>4. Click "Create Connection" to save it</p>
        </div>
      </div>
    </form>
  );
};

export default TrofosConfigForm;