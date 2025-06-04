// frontend/src/components/common/ServiceAvailabilityBanner.tsx
import React from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useConnections } from '../../contexts/ConnectionsContext';

interface ServiceAvailabilityBannerProps {
  className?: string;
}

const ServiceAvailabilityBanner: React.FC<ServiceAvailabilityBannerProps> = ({ className = '' }) => {
  const { isServiceAvailable, error, refreshConnections, isLoading } = useConnections();

  // Don't show banner if service is available
  if (isServiceAvailable) {
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
            Some features may be limited. You can still use templates and view documentation, 
            but connecting to platforms and generating reports requires the integration service to be running.
          </p>
          {error && (
            <p className="text-xs text-yellow-600 mb-3 font-mono bg-yellow-100 p-2 rounded">
              {error}
            </p>
          )}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="flex items-center text-sm text-yellow-800 hover:text-yellow-900 font-medium disabled:opacity-50"
            >
              <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Checking...' : 'Retry Connection'}
            </button>
            <span className="text-yellow-600">•</span>
            <a
              href="https://docs.prism.com/troubleshooting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-yellow-800 hover:text-yellow-900 underline"
            >
              Troubleshooting Guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceAvailabilityBanner;