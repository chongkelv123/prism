// frontend/src/components/feature-specific/connections/MondayConfigForm.tsx - CLEAN FIXED VERSION
import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface MondayConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface MondayConfig {
  name: string;
  apiToken: string;
  apiUrl: string;
  boardId: string;
}

interface TestStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const MondayConfigForm: React.FC<MondayConfigFormProps> = ({ onSubmit, onBack, isSubmitting }) => {
  const [config, setConfig] = useState<MondayConfig>({
    name: 'Monday.com Main Board',
    apiToken: '',
    apiUrl: 'https://api.monday.com/v2',
    boardId: ''
  });
  
  const [showApiToken, setShowApiToken] = useState(false);
  const [errors, setErrors] = useState<Partial<MondayConfig>>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [testMessage, setTestMessage] = useState<string>('');
  const [discoveredBoards, setDiscoveredBoards] = useState<any[]>([]);

  const handleChange = (field: keyof MondayConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Reset test when credentials change
    if (field !== 'name' && testStatus !== 'idle') {
      setTestStatus('idle');
      setTestSteps([]);
      setTestMessage('');
      setDiscoveredBoards([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<MondayConfig> = {};
    
    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    
    if (!config.apiToken.trim()) {
      newErrors.apiToken = 'API token is required';
    }
    
    if (!config.apiUrl.trim()) {
      newErrors.apiUrl = 'API URL is required';
    } else if (!config.apiUrl.startsWith('http')) {
      newErrors.apiUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Use backend proxy to avoid CORS issues (same as Jira approach)
  const testMondayConnection = async () => {
    const response = await fetch('/api/monday-proxy/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiToken: config.apiToken.trim(),
        apiUrl: config.apiUrl.trim(),
        boardId: config.boardId.trim() || undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  };

  const getBoardsList = async () => {
    const response = await fetch('/api/monday-proxy/get-boards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiToken: config.apiToken.trim(),
        apiUrl: config.apiUrl.trim()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get boards');
    }

    return await response.json();
  };

  const updateTestStep = (stepName: string, status: 'pending' | 'success' | 'error', message: string, details?: any) => {
    setTestSteps(prev => {
      const existing = prev.find(s => s.step === stepName);
      const newStep = { step: stepName, status, message, details };
      
      if (existing) {
        return prev.map(s => s.step === stepName ? newStep : s);
      } else {
        return [...prev, newStep];
      }
    });
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setTestStatus('testing');
    setTestSteps([]);
    setTestMessage('Starting connection test...');
    setDiscoveredBoards([]);
    
    try {
      console.log('Testing Monday.com connection through backend proxy...');
      
      // Use backend proxy for testing (avoids CORS issues)
      const result = await testMondayConnection();
      
      if (result.success) {
        // Process successful test steps
        if (result.steps) {
          result.steps.forEach((step: any) => {
            updateTestStep(step.step, step.status, step.message, step.details);
          });
        }
        
        // If no board ID was set, try to get boards for selection
        if (!config.boardId) {
          try {
            updateTestStep('Loading Boards', 'pending', 'Getting available boards...');
            const boardsResult = await getBoardsList();
            
            if (boardsResult.success && boardsResult.boards) {
              setDiscoveredBoards(boardsResult.boards);
              updateTestStep('Loading Boards', 'success', `Found ${boardsResult.boards.length} active boards`);
              
              // Auto-select PRISM board if found
              const prismBoard = boardsResult.boards.find((board: any) => 
                board.name.toLowerCase().includes('prism')
              );
              
              if (prismBoard) {
                setConfig(prev => ({ ...prev, boardId: prismBoard.id }));
                updateTestStep('Auto-Selection', 'success', `Auto-selected: ${prismBoard.name}`);
              }
            }
          } catch (boardsError) {
            updateTestStep('Loading Boards', 'error', 'Could not load boards for selection');
          }
        }
        
        setTestStatus('success');
        setTestMessage('All tests passed! Ready to create connection.');
        setErrors({});
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
      
    } catch (error) {
      console.error('Monday.com connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      setTestStatus('error');
      setTestMessage(errorMessage);
      setErrors({ apiToken: errorMessage });
      
      // Add error step if no steps were returned
      if (testSteps.length === 0) {
        updateTestStep('Connection Test', 'error', errorMessage);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (testStatus !== 'success') {
      setErrors({ apiToken: 'Please test the connection before submitting' });
      return;
    }

    // Create connection data
    const connectionData = {
      name: config.name.trim(),
      platform: 'monday' as const,
      config: {
        apiToken: config.apiToken.trim(),
        apiUrl: config.apiUrl.trim(),
        boardId: config.boardId.trim()
      }
    };
    
    onSubmit(connectionData);
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'pending':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const isFormValid = config.name && config.apiToken && config.apiUrl;
  const canTest = isFormValid && testStatus !== 'testing';
  const canSubmit = testStatus === 'success' && !isSubmitting;

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
          Enter your Monday.com API token to sync your board data
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
          placeholder="Monday.com Main Board"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
            placeholder="Enter your Monday.com API token"
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
            href="https://auth.monday.com/users/sign_in" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Get your API token from Monday.com
          </a>
        </div>
      </div>

      {/* API URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API URL
        </label>
        <input
          type="text"
          value={config.apiUrl}
          onChange={(e) => handleChange('apiUrl', e.target.value)}
          placeholder="https://api.monday.com/v2"
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.apiUrl ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.apiUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.apiUrl}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Monday.com GraphQL API endpoint
        </p>
      </div>

      {/* Board ID (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Board ID (Optional)
        </label>
        <input
          type="text"
          value={config.boardId}
          onChange={(e) => handleChange('boardId', e.target.value)}
          placeholder="Leave empty to auto-discover"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          If empty, we'll help you choose from your available boards
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
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        
        {/* Test Steps */}
        {testSteps.length > 0 && (
          <div className="space-y-2 mb-3">
            {testSteps.map((step, index) => (
              <div key={index} className="flex items-center text-sm">
                {getTestStatusIcon(step.status)}
                <span className="ml-2 font-medium">{step.step}:</span>
                <span className="ml-1">{step.message}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Test Message */}
        {testMessage && (
          <div className={`text-sm ${
            testStatus === 'success' ? 'text-green-600' : 
            testStatus === 'error' ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {testMessage}
          </div>
        )}
        
        {/* Board Selection */}
        {discoveredBoards.length > 0 && !config.boardId && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Board
            </label>
            <select
              value={config.boardId}
              onChange={(e) => handleChange('boardId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a board...</option>
              {discoveredBoards.map(board => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.items_count} items)
                </option>
              ))}
            </select>
          </div>
        )}
        
        {testStatus === 'idle' && (
          <div className="flex items-start text-gray-500 text-sm">
            <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>
              Test your connection to verify credentials and discover boards
            </span>
          </div>
        )}
      </div>

      {/* Monday.com Integration Details */}
      <div className="bg-orange-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-2">Monday.com Integration Details</h5>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Syncs boards, items, and project status updates</p>
          <p>• Pulls team member assignments and progress tracking</p>
          <p>• Retrieves status columns and timeline information</p>
          <p>• Updates automatically to reflect current workspace state</p>
        </div>
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
          <p>1. Get your API token from Monday.com (link above)</p>
          <p>2. Fill in the form with your token</p>
          <p>3. Click "Test Connection" to verify it works</p>
          <p>4. Select a board if needed</p>
          <p>5. Click "Create Connection" to save it</p>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Debug Info:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Form Valid: {isFormValid ? 'Yes' : 'No'}</p>
            <p>Test Status: {testStatus}</p>
            <p>Can Test: {canTest ? 'Yes' : 'No'}</p>
            <p>Can Submit: {canSubmit ? 'Yes' : 'No'}</p>
            <p>Boards Found: {discoveredBoards.length}</p>
            <p>Board ID: {config.boardId || 'Not set'}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default MondayConfigForm;