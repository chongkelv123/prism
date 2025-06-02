// frontend/src/components/feature-specific/connections/AddConnectionModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Connection } from '../../../contexts/ConnectionsContext';
import PlatformSelector from './PlatformSelector';
import MondayConfigForm from './MondayConfigForm';
import JiraConfigForm from './JiraConfigForm';
import TrofosConfigForm from './TrofosConfigForm';

interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionAdded: (connection: Omit<Connection, 'id' | 'createdAt'>) => void;
}

type Platform = 'monday' | 'jira' | 'trofos';

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionAdded
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [step, setStep] = useState<'platform' | 'configure'>('platform');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setStep('configure');
  };

  const handleBack = () => {
    if (step === 'configure') {
      setStep('platform');
      setSelectedPlatform(null);
    }
  };

  const handleConnectionSubmit = async (connectionData: any) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newConnection: Omit<Connection, 'id' | 'createdAt'> = {
        name: connectionData.name,
        platform: selectedPlatform!,
        status: 'connected',
        lastSync: 'Just now',
        projectCount: connectionData.projectCount || 0,
        configuration: connectionData
      };
      
      onConnectionAdded(newConnection);
      handleClose();
    } catch (error) {
      console.error('Failed to create connection:', error);
      // Handle error - could show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('platform');
    setSelectedPlatform(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'platform' ? 'Add New Connection' : `Connect to ${selectedPlatform}`}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'platform' 
                ? 'Choose a platform to connect with PRISM'
                : 'Configure your connection settings'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'platform' && (
            <PlatformSelector onPlatformSelect={handlePlatformSelect} />
          )}
          
          {step === 'configure' && selectedPlatform && (
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
          )}
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
      </div>
    </div>
  );
};

export default AddConnectionModal;