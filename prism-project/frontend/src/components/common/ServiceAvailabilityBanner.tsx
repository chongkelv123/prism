// frontend/src/components/common/ServiceAvailabilityBanner.tsx - UPDATED
import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useConnections } from '../../contexts/ConnectionsContext';

interface ServiceAvailabilityBannerProps {
  className?: string;
}

const ServiceAvailabilityBanner: React.FC<ServiceAvailabilityBannerProps> = ({ className = '' }) => {
  const { isServiceAvailable, error, refreshConnections, isLoading } = useConnections();

  // Show loading state during initial service check
  if (isLoading && isServiceAvailable === false && !error) {
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
          </div>
        </div>
      </div>
    );
  }

  // Don't show banner if service is available and no error
  if (isServiceAvailable && !error) {
    return null;
  }

  const handleRetry = async () => {
    try {
      await refreshConnections();
    } catch (error) {
      console.log('Retry failed, service still unavailable');
    }
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle size={20} className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">
            Platform Integrations Service Unavailable
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            {error || 'The platform integrations service is not responding. Some features may be limited. You can still view documentation and templates, but connecting to platforms and generating reports requires the integration service to be running.'}
          </p>
          
          {/* Show specific error details if available */}
          {error && error !== 'Platform integrations service is not available' && (
            <p className="text-xs text-yellow-600 mb-3 font-mono bg-yellow-100 p-2 rounded">
              Details: {error}
            </p>
          )}
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center text-sm text-yellow-800 hover:text-yellow-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Checking...' : 'Retry Connection'}
            </button>
            
            <span className="text-yellow-600">•</span>
            
            <a
              href="https://github.com/your-repo/prism#troubleshooting"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-yellow-800 hover:text-yellow-900 underline"
            >
              <ExternalLink size={12} className="mr-1" />
              Troubleshooting Guide
            </a>
            
            <span className="text-yellow-600">•</span>
            
            <button
              onClick={() => {
                console.log('Service Health Debug Info:');
                console.log('isServiceAvailable:', isServiceAvailable);
                console.log('error:', error);
                console.log('isLoading:', isLoading);
                
                // Test health endpoints manually
                fetch('http://localhost:3000/health')
                  .then(r => r.json())
                  .then(data => console.log('API Gateway Health:', data))
                  .catch(e => console.error('API Gateway Error:', e));
                  
                fetch('http://localhost:3000/api/platform-integrations/health')
                  .then(r => r.json())
                  .then(data => console.log('Platform Service Health:', data))
                  .catch(e => console.error('Platform Service Error:', e));
              }}
              className="text-sm text-yellow-800 hover:text-yellow-900 underline"
            >
              Debug Info
            </button>
          </div>
          
          {/* Development mode helper */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <strong>Development Tips:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Check if docker-compose services are running: <code>docker-compose ps</code></li>
                <li>• Verify API Gateway: <code>curl http://localhost:3000/health</code></li>
                <li>• Verify Platform Service: <code>curl http://localhost:4005/health</code></li>
                <li>• Check browser console for network errors</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceAvailabilityBanner;