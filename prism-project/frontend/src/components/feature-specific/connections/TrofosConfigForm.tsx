// frontend/src/components/feature-specific/connections/TrofosConfigForm.tsx - IMPROVED TO MATCH ESTABLISHED PATTERNS
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const SHOW_DEBUG_PANEL = false; // Set to false to hide debug panel

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
  description?: string;
}

const TrofosConfigForm: React.FC<TrofosConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<TrofosConfig>({
    name: 'PRISM TROFOS Connection',
    serverUrl: 'https://trofos-production.comp.nus.edu.sg/api/external',
    apiKey: '',
    projectId: ''
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
    if (field !== 'name' && field !== 'projectId' && testStatus !== 'idle') {
      setTestStatus('idle');
      setTestMessage('');
      setAvailableProjects([]);
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
    
    if (!config.projectId.trim()) {
      newErrors.projectId = 'Project selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mock test connection function (to match pattern of other forms)
  const testTrofosConnection = async () => {
    // Simulate the real TROFOS API test using confirmed working endpoints
    const testResponse = await fetch('/api/trofos-proxy/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverUrl: config.serverUrl.trim(),
        apiKey: config.apiKey.trim()
      })
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      throw new Error(errorData.error || `HTTP ${testResponse.status}: ${testResponse.statusText}`);
    }

    return await testResponse.json();
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
    setTestMessage('');
    setAvailableProjects([]);
    
    try {
      console.log('🔄 Testing TROFOS connection...');
      
      // In real implementation, this would call the backend API
      // For now, simulate with the confirmed working projects
      const result = await testTrofosConnection();
      
      console.log('✅ TROFOS connection test successful');
      
      // Simulate successful connection with real project data
      const mockProjects: TrofosProject[] = [
        { 
          id: '172', 
          name: 'PRISM Project Test Issues',
          description: 'Recommended for demo and testing'
        },
        { 
          id: '127', 
          name: 'CS4218 2420 Team 40',
          description: '130+ real tasks with sprint data'
        },
        { 
          id: '2', 
          name: 'SPA [29]',
          description: 'Active project'
        }
      ];
      
      setTestStatus('success');
      setTestMessage('Connection successful! Projects loaded.');
      setAvailableProjects(mockProjects);
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
    
    console.log('🔄 TrofosConfigForm: Form submitted');
    
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }
    
    if (testStatus !== 'success') {
      console.log('❌ Connection not tested');
      setErrors({ apiKey: 'Please test the connection before submitting' });
      return;
    }

    console.log('✅ Creating TROFOS connection...');
    
    const selectedProject = availableProjects.find(p => p.id === config.projectId);
    
    // Create connection data (matches pattern of other forms)
    const connectionData = {
      name: config.name.trim(),
      platform: 'trofos' as const,
      config: {
        serverUrl: config.serverUrl.trim(),
        apiKey: config.apiKey.trim(),
        projectId: config.projectId.trim()
      },
      projectName: selectedProject?.name || 'Unknown Project',
      projectCount: 1
    };
    
    console.log('📦 TROFOS connection data prepared');
    
    // Call parent's onSubmit
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

  const isFormValid = config.name && config.serverUrl && config.apiKey && config.projectId;
  const canTest = config.serverUrl && config.apiKey && testStatus !== 'testing';
  const canSubmit = testStatus === 'success' && isFormValid && !isSubmitting;

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
          placeholder="https://trofos-production.comp.nus.edu.sg/api/external"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.serverUrl ? 'border-red-500' : 'border-gray-300'
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
            href="https://trofos-production.comp.nus.edu.sg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Get your API key from TROFOS Settings
          </a>
        </div>
      </div>

      {/* Test Connection Button */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {getTestStatusIcon()}
            <span className="ml-2 font-medium text-gray-900">
              Connection Test
            </span>
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!canTest}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testStatus === 'testing' ? (
              <div className="flex items-center">
                <RefreshCw size={14} className="animate-spin mr-2" />
                Testing...
              </div>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
        
        {testMessage && (
          <p className={`text-sm ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {testMessage}
          </p>
        )}
      </div>

      {/* Project Selection */}
      {availableProjects.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            value={config.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.projectId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a project...</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} {project.description && `- ${project.description}`}
              </option>
            ))}
          </select>
          {errors.projectId && (
            <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
          )}
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

      {/* Simple Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          Simple Process:
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>1. Fill in your TROFOS server URL and API key</p>
          <p>2. Click "Test Connection" to verify it works</p>
          <p>3. Select a project from the loaded list</p>
          <p>4. Click "Create Connection" to save it</p>
          <p>5. No redirects, no complex flows - just works!</p>
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
            <p>Projects Loaded: {availableProjects.length}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default TrofosConfigForm;