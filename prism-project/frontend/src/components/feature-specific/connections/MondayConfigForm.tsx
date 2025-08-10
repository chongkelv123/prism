// frontend/src/components/feature-specific/connections/MondayConfigForm.tsx

import React from 'react';
import { ArrowLeft, Clock, Wrench } from 'lucide-react';

interface MondayConfigFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const MondayConfigForm: React.FC<MondayConfigFormProps> = ({ onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Monday.com Integration
        </h3>
        <p className="text-gray-600">
          Connect your Monday.com workspace to PRISM
        </p>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h4 className="text-xl font-semibold text-gray-800 mb-2">
          Under Construction
        </h4>
        <p className="text-gray-600 mb-4">
          Monday.com integration is coming soon! We're working hard to bring you seamless project synchronization.
        </p>
        <div className="bg-white rounded-lg p-4 mb-4">
          <h5 className="font-medium text-gray-800 mb-2">What's Coming:</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Board and item synchronization</li>
            <li>• Team member progress tracking</li>
            <li>• Automated report generation</li>
            <li>• Real-time status updates</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Stay tuned for updates on our progress!
        </p>
      </div>

      {/* Back Button */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Platform Selection
        </button>
      </div>
    </div>
  );
};

export default MondayConfigForm;