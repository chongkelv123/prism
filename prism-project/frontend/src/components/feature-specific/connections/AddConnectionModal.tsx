// frontend/src/components/feature-specific/connections/AddConnectionModal.tsx - FIXED WITH TROFOS SUPPORT
import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import PlatformSelector from './PlatformSelector';
import JiraConfigForm from './JiraConfigForm';
import MondayConfigForm from './MondayConfigForm';
import TrofosConfigForm from './TrofosConfigForm';

interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionAdded: (connection: any) => void;
}

type Platform = 'monday' | 'jira' | 'trofos';

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionAdded
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [step, setStep] = useState<'platform' | 'configure' | 'success'>('platform');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handlePlatformSelect = (platform: Platform) => {
    console.log('Platform selected:', platform);
    setSelectedPlatform(platform);
    setStep('configure');
    setErrorMessage('');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('platform');
      setSelectedPlatform(null);
    } else if (step === 'success') {
      // Close modal after success
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('platform');
    setSelectedPlatform(null);
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmitting(false);
    onClose();
  };

  const handleConnectionSubmit = async (connectionData: any) => {
    console.log('AddConnectionModal: Starting connection creation');
    console.log('Connection data:', {
      name: connectionData.name,
      platform: connectionData.platform,
      configKeys: Object.keys(connectionData.config || {})
    });

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Prevent any navigation during this process
      window.history.pushState(null, '', window.location.href);
      
      console.log('Processing connection...');
      
      // Simple success flow - no complex backend calls
      setSuccessMessage(`Connection "${connectionData.name}" created successfully!`);
      setStep('success');

      // Notify parent component (this will save to localStorage)
      onConnectionAdded(connectionData);

      console.log('Connection creation completed successfully');
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Connection creation failed:', error);
      
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Failed to create connection. Please try again.';
        
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'platform':
        return (
          <PlatformSelector onPlatformSelect={handlePlatformSelect} />
        );
        
      case 'configure':
        return (
          <div>
            {selectedPlatform === 'monday' && (
              <MondayConfigForm 
                onSubmit={handleConnectionSubmit}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}
            {selectedPlatform === 'jira' && (
              <JiraConfigForm 
                onSubmit={handleConnectionSubmit}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}
            {selectedPlatform === 'trofos' && (
              <TrofosConfigForm 
                onSubmit={handleConnectionSubmit}
                onBack={handleBack}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connection Created!
            </h3>
            <p className="text-gray-600 mb-4">
              {successMessage}
            </p>
            <p className="text-sm text-gray-500">
              This modal will close automatically...
            </p>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'platform' && 'Add New Connection'}
              {step === 'configure' && `Connect to ${selectedPlatform?.toUpperCase()}`}
              {step === 'success' && 'Success!'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'platform' && 'Choose a platform to connect with PRISM'}
              {step === 'configure' && 'Configure your connection settings'}
              {step === 'success' && 'Your connection has been created'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Error</h4>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          {renderContent()}
        </div>

        {/* Footer */}
        {step === 'platform' && (
          <div className="flex justify-end items-center p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-4 bg-gray-100 border-t text-xs text-gray-600">
            <strong>Debug:</strong> Step: {step}, Platform: {selectedPlatform || 'None'}, Submitting: {isSubmitting ? 'Yes' : 'No'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddConnectionModal;