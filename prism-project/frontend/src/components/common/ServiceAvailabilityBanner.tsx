// frontend/src/components/common/ServiceAvailabilityBanner.tsx - COMPLETE VERSION
import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink, Info, X } from 'lucide-react';
import { useConnections } from '../../contexts/ConnectionsContext';

interface ServiceAvailabilityBannerProps {
  className?: string;
  showSuccessBanner?: boolean;
  autoHideSuccess?: boolean;
  autoHideDelay?: number;
}

const ServiceAvailabilityBanner: React.FC<ServiceAvailabilityBannerProps> = ({ 
  className = '',
  showSuccessBanner = true,
  autoHideSuccess = true,
  autoHideDelay = 3000
}) => {
  const { isServiceAvailable, error, checkServiceHealth, isLoading } = useConnections();
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Auto-hide success banner
  React.useEffect(() => {
    if (isServiceAvailable && showSuccessBanner && autoHideSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [isServiceAvailable, showSuccessBanner, autoHideSuccess, autoHideDelay]);

  // Reset dismissed state when service status changes
  React.useEffect(() => {
    setIsDismissed(false);
  }, [isServiceAvailable, error]);

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Show loading state during initial service check
  if (isLoading && !isServiceAvailable && !error) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start">
          <RefreshCw size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0 animate-spin" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Checking Service Availability
            </h3>
            <p className="text-sm text-blue-700">
              Verifying platform integrations service connection...
            </p>
            <div className="mt-2">
              <div className="w-full bg-blue-200 rounded-full h-1">
                <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success banner if service becomes available and showSuccessBanner is true
  if (isServiceAvailable && showSuccessBanner && showSuccess) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 mb-1">
                Platform Integrations Service Available
              </h3>
              <p className="text-sm text-green-700">
                All platform integration features are working correctly. You can now connect to Monday.com, Jira, and TROFOS.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-green-400 hover:text-green-600 transition-colors ml-2"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Show error banner if service is unavailable
  if (!isServiceAvailable) {
    const handleRetry = async () => {
      try {
        await checkServiceHealth();
      } catch (error) {
        console.log('Retry failed, service still unavailable');
      }
    };

    const handleDismiss = () => {
      setIsDismissed(true);
    };

    const getErrorSeverity = () => {
      if (error && (
        error.includes('ECONNREFUSED') || 
        error.includes('Network Error') || 
        error.includes('fetch')
      )) {
        return 'high'; // Critical connectivity issue
      }
      if (error && error.includes('404')) {
        return 'medium'; // Service routing issue
      }
      return 'low'; // General availability issue
    };

    const errorSeverity = getErrorSeverity();

    return (
      <div className={`${
        errorSeverity === 'high' ? 'bg-red-50 border-red-200' :
        errorSeverity === 'medium' ? 'bg-orange-50 border-orange-200' :
        'bg-yellow-50 border-yellow-200'
      } border rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <AlertTriangle size={20} className={`${
              errorSeverity === 'high' ? 'text-red-600' :
              errorSeverity === 'medium' ? 'text-orange-600' :
              'text-yellow-600'
            } mr-3 mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <h3 className={`text-sm font-medium mb-1 ${
                errorSeverity === 'high' ? 'text-red-800' :
                errorSeverity === 'medium' ? 'text-orange-800' :
                'text-yellow-800'
              }`}>
                Platform Integrations Service Unavailable
              </h3>
              <p className={`text-sm mb-3 ${
                errorSeverity === 'high' ? 'text-red-700' :
                errorSeverity === 'medium' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                {error || 'The platform integrations service is not responding. Some features may be limited. You can still view documentation and templates, but connecting to platforms and generating reports requires the integration service to be running.'}
              </p>
              
              {/* Show specific error details if available */}
              {error && error !== 'Platform integrations service is not available' && (
                <div className={`mb-3 p-2 rounded text-xs font-mono ${
                  errorSeverity === 'high' ? 'bg-red-100 text-red-600' :
                  errorSeverity === 'medium' ? 'bg-orange-100 text-orange-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <strong>Details:</strong> {error}
                </div>
              )}
              
              {/* Service status indicators */}
              <div className={`mb-3 p-2 rounded text-xs ${
                errorSeverity === 'high' ? 'bg-red-100' :
                errorSeverity === 'medium' ? 'bg-orange-100' :
                'bg-yellow-100'
              }`}>
                <div className="flex items-center mb-1">
                  <Info size={12} className={`mr-1 ${
                    errorSeverity === 'high' ? 'text-red-600' :
                    errorSeverity === 'medium' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} />
                  <strong className={
                    errorSeverity === 'high' ? 'text-red-800' :
                    errorSeverity === 'medium' ? 'text-orange-800' :
                    'text-yellow-800'
                  }>
                    What this means:
                  </strong>
                </div>
                <ul className={`ml-4 space-y-1 ${
                  errorSeverity === 'high' ? 'text-red-700' :
                  errorSeverity === 'medium' ? 'text-orange-700' :
                  'text-yellow-700'
                }`}>
                  <li>• Platform connections (Monday.com, Jira, TROFOS) won't work</li>
                  <li>• Report generation from external platforms is disabled</li>
                  <li>• Existing templates and documentation remain available</li>
                  <li>• Service will automatically reconnect when available</li>
                </ul>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className={`flex items-center text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    errorSeverity === 'high' ? 'text-red-800 hover:text-red-900' :
                    errorSeverity === 'medium' ? 'text-orange-800 hover:text-orange-900' :
                    'text-yellow-800 hover:text-yellow-900'
                  }`}
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Checking...' : 'Retry Connection'}
                </button>
                
                <span className={
                  errorSeverity === 'high' ? 'text-red-600' :
                  errorSeverity === 'medium' ? 'text-orange-600' :
                  'text-yellow-600'
                }>•</span>
                
                <a
                  href="https://github.com/your-repo/prism#troubleshooting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center text-sm underline transition-colors ${
                    errorSeverity === 'high' ? 'text-red-800 hover:text-red-900' :
                    errorSeverity === 'medium' ? 'text-orange-800 hover:text-orange-900' :
                    'text-yellow-800 hover:text-yellow-900'
                  }`}
                >
                  <ExternalLink size={12} className="mr-1" />
                  Troubleshooting Guide
                </a>
                
                <span className={
                  errorSeverity === 'high' ? 'text-red-600' :
                  errorSeverity === 'medium' ? 'text-orange-600' :
                  'text-yellow-600'
                }>•</span>
                
                <button
                  onClick={() => {
                    console.group('🔍 Service Health Debug Info');
                    console.log('Service Available:', isServiceAvailable);
                    console.log('Error:', error);
                    console.log('Loading:', isLoading);
                    console.log('Error Severity:', errorSeverity);
                    console.log('Timestamp:', new Date().toISOString());
                    console.groupEnd();
                    
                    // Test health endpoints manually
                    console.group('🏥 Health Check Tests');
                    
                    fetch('/api/health')
                      .then(r => r.json())
                      .then(data => console.log('✅ API Gateway Health:', data))
                      .catch(e => console.error('❌ API Gateway Error:', e));
                      
                    fetch('/api/platform-integrations/health')
                      .then(r => r.json())
                      .then(data => console.log('✅ Platform Service Health:', data))
                      .catch(e => console.error('❌ Platform Service Error:', e));
                    
                    // Test direct service connection
                    fetch('http://localhost:4005/health')
                      .then(r => r.json())
                      .then(data => console.log('✅ Direct Platform Service Health:', data))
                      .catch(e => console.error('❌ Direct Platform Service Error:', e));
                    
                    console.groupEnd();
                    
                    alert('Debug information logged to console. Press F12 to view.');
                  }}
                  className={`text-sm underline transition-colors ${
                    errorSeverity === 'high' ? 'text-red-800 hover:text-red-900' :
                    errorSeverity === 'medium' ? 'text-orange-800 hover:text-orange-900' :
                    'text-yellow-800 hover:text-yellow-900'
                  }`}
                >
                  Debug Info
                </button>
              </div>
              
              {/* Development mode helper */}
              {process.env.NODE_ENV === 'development' && (
                <div className={`mt-3 p-2 rounded text-xs ${
                  errorSeverity === 'high' ? 'bg-red-100 text-red-800' :
                  errorSeverity === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  <strong>Development Tips:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Check if docker-compose services are running: <code className="bg-black bg-opacity-10 px-1 rounded">docker-compose ps</code></li>
                    <li>• Verify API Gateway: <code className="bg-black bg-opacity-10 px-1 rounded">curl http://localhost:3000/health</code></li>
                    <li>• Verify Platform Service: <code className="bg-black bg-opacity-10 px-1 rounded">curl http://localhost:4005/health</code></li>
                    <li>• Check browser console for network errors</li>
                    <li>• Restart platform service: <code className="bg-black bg-opacity-10 px-1 rounded">cd backend/services/platform-integrations-service && npm run dev</code></li>
                    <li>• Use PowerShell script: <code className="bg-black bg-opacity-10 px-1 rounded">./start-prism-dev.ps1</code></li>
                  </ul>
                </div>
              )}
              
              {/* Quick fix suggestions based on error type */}
              {errorSeverity === 'high' && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                  <strong>Quick Fix:</strong> The service appears to be completely down. 
                  Try restarting the platform integrations service or run the development startup script.
                </div>
              )}
              
              {errorSeverity === 'medium' && (
                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                  <strong>Quick Fix:</strong> This looks like a routing issue. 
                  Check that the API Gateway is running and properly configured.
                </div>
              )}
            </div>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className={`transition-colors ml-2 ${
              errorSeverity === 'high' ? 'text-red-400 hover:text-red-600' :
              errorSeverity === 'medium' ? 'text-orange-400 hover:text-orange-600' :
              'text-yellow-400 hover:text-yellow-600'
            }`}
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Default: don't show banner when service is available and success banner is disabled/hidden
  return null;
};

export default ServiceAvailabilityBanner;