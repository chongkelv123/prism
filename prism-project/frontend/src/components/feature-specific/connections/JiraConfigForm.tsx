// frontend/src/components/feature-specific/connections/JiraConfigForm.tsx
import React, { useState, useEffect } from 'react';
import { useConnections } from '../../../contexts/ConnectionsContext';
import { useAuth } from '../../../contexts/AuthContext';

interface JiraConfig {
  name: string;
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface FormErrors {
  name?: string;
  domain?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
  general?: string;
}

interface JiraConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const JiraConfigForm: React.FC<JiraConfigFormProps> = ({ onSuccess, onCancel }) => {
  const { validatePlatformConfig, createConnection, isLoading } = useConnections();
  const { isAuthenticated } = useAuth();

  const [config, setConfig] = useState<JiraConfig>({
    name: '',
    domain: '',
    email: '',
    apiToken: '',
    projectKey: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Reset test result when config changes
  useEffect(() => {
    if (connectionTested) {
      setConnectionTested(false);
      setTestResult(null);
    }
  }, [config.domain, config.email, config.apiToken, config.projectKey]);

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      setErrors(prev => ({
        ...prev,
        general: 'Please log in to configure connections.',
      }));
    } else {
      setErrors(prev => {
        const { general, ...rest } = prev;
        return rest;
      });
    }
  }, [isAuthenticated]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Connection name validation
    if (!config.name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    // Domain validation
    if (!config.domain.trim()) {
      newErrors.domain = 'Jira domain is required';
    } else {
      const domain = config.domain.trim();
      // Allow .atlassian.net domains or http/https URLs
      if (!domain.includes('.atlassian.net') && !domain.startsWith('http')) {
        newErrors.domain = 'Please enter a valid Jira domain (e.g., company.atlassian.net)';
      }
    }

    // Email validation
    if (!config.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // API Token validation
    if (!config.apiToken.trim()) {
      newErrors.apiToken = 'API token is required';
    }

    // Project Key validation
    if (!config.projectKey.trim()) {
      newErrors.projectKey = 'Project key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof JiraConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleTestConnection = async () => {
    try {
      // Clear previous results
      setTestResult(null);
      setErrors({});

      // Check authentication first
      if (!isAuthenticated) {
        setErrors({ general: 'Please log in to test the connection.' });
        return;
      }

      // Validate required fields for testing
      const testConfig = {
        domain: config.domain.trim(),
        email: config.email.trim(),
        apiToken: config.apiToken.trim(), // ← **CRITICAL: Don't forget this!**
        projectKey: config.projectKey.trim(),
      };

      const requiredFields = ['domain', 'email', 'apiToken', 'projectKey'];
      const missingFields = requiredFields.filter(field => !testConfig[field as keyof typeof testConfig]);

      if (missingFields.length > 0) {
        const fieldErrors: FormErrors = {};
        missingFields.forEach(field => {
          fieldErrors[field as keyof FormErrors] = `${field} is required for testing`;
        });
        setErrors(fieldErrors);
        return;
      }

      console.log('Testing connection with config keys:', Object.keys(testConfig));

      setIsTestingConnection(true);

      const result = await validatePlatformConfig('jira', testConfig);
      
      setTestResult(result);
      setConnectionTested(result.valid);

      if (!result.valid) {
        // Show error on API token field for connection failures
        setErrors({
          apiToken: result.message,
        });
      }

    } catch (error: any) {
      console.error('Test connection error:', error);
      
      const errorMessage = error.message || 'Failed to test connection';
      
      setTestResult({
        valid: false,
        message: errorMessage,
      });
      
      setErrors({
        apiToken: errorMessage,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form
      if (!validateForm()) {
        return;
      }

      // Check if connection was tested
      if (!connectionTested) {
        setErrors({
          general: 'Please test the connection before saving.',
        });
        return;
      }

      // Check authentication
      if (!isAuthenticated) {
        setErrors({
          general: 'Please log in to create the connection.',
        });
        return;
      }

      // Create connection
      await createConnection('jira', config.name, {
        domain: config.domain.trim(),
        email: config.email.trim(),
        apiToken: config.apiToken.trim(),
        projectKey: config.projectKey.trim(),
      });

      // Success callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Create connection error:', error);
      setErrors({
        general: error.message || 'Failed to create connection',
      });
    }
  };

  const isFormValid = () => {
    return config.name.trim() && 
           config.domain.trim() && 
           config.email.trim() && 
           config.apiToken.trim() && 
           config.projectKey.trim();
  };

  return (
    <div className="jira-config-form">
      <div className="form-header">
        <h3>Connect to Jira</h3>
        <p>Enter your Jira Cloud credentials to sync your project data</p>
      </div>

      {errors.general && (
        <div className="error-banner">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="connectionName">Connection Name</label>
          <input
            id="connectionName"
            type="text"
            value={config.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Jira"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="jiraDomain">Jira Domain</label>
          <input
            id="jiraDomain"
            type="text"
            value={config.domain}
            onChange={(e) => handleInputChange('domain', e.target.value)}
            placeholder="chongkelv.atlassian.net"
            className={errors.domain ? 'error' : ''}
          />
          <small>Your Jira Cloud domain (without https://)</small>
          {errors.domain && <span className="error-text">{errors.domain}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={config.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="chongkelv@gmail.com"
            className={errors.email ? 'error' : ''}
          />
          <small>The email address associated with your Jira account</small>
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="apiToken">API Token</label>
          <input
            id="apiToken"
            type="password"
            value={config.apiToken}
            onChange={(e) => handleInputChange('apiToken', e.target.value)}
            placeholder="Your Jira API token"
            className={errors.apiToken ? 'error' : ''}
          />
          <small>
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">
              How to create an API token
            </a>
          </small>
          {errors.apiToken && <span className="error-text">{errors.apiToken}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="projectKey">Project Key</label>
          <input
            id="projectKey"
            type="text"
            value={config.projectKey}
            onChange={(e) => handleInputChange('projectKey', e.target.value.toUpperCase())}
            placeholder="PRISM"
            className={errors.projectKey ? 'error' : ''}
          />
          <small>The key of the Jira project you want to sync (e.g., PRISM, DEV, PROJ)</small>
          {errors.projectKey && <span className="error-text">{errors.projectKey}</span>}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!isFormValid() || isTestingConnection || isLoading}
            className="test-connection-btn"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={`test-result ${testResult.valid ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}
        </div>

        <div className="form-footer">
          <button type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!connectionTested || isLoading || !isAuthenticated}
            className="create-connection-btn"
          >
            {isLoading ? 'Creating...' : 'Create Connection'}
          </button>
        </div>
      </form>

      <div className="debug-info">
        <h4>Jira Integration Details</h4>
        <ul>
          <li>• Syncs issues, epics, and sprint data from your project</li>
          <li>• Pulls team member assignments and story points</li>
          <li>• Retrieves workflow status and priority information</li>
          <li>• Updates automatically to reflect current project state</li>
        </ul>
      </div>
    </div>
  );
};

export default JiraConfigForm;