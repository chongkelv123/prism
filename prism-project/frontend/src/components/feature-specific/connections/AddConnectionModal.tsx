// frontend/src/components/feature-specific/connections/AddConnectionModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Connection } from '../../../pages/ConnectionsPage';
import PlatformSelector from './PlatformSelector';

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
              {/* Platform-specific configuration forms will go here */}
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Configuration form for {selectedPlatform} will be implemented next.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={step === 'platform' ? handleClose : handleBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {step === 'platform' ? 'Cancel' : 'Back'}
          </button>
          
          {step === 'configure' && (
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled
            >
              Connect (Coming Soon)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddConnectionModal;