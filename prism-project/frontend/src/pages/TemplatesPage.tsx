import React from 'react';
import { ArrowLeft, Clock, Wrench, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">PowerPoint Templates</h1>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Under Construction
            </h2>
            <p className="text-gray-600 mb-6">
              Template management features are coming soon!
            </p>

            {/* Feature Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-medium text-gray-800 mb-3">What's Coming:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="text-left">
                  <ul className="space-y-2">
                    <li>• Custom template creation</li>
                    <li>• Template editing & customization</li>
                    <li>• Brand guidelines integration</li>
                  </ul>
                </div>
                <div className="text-left">
                  <ul className="space-y-2">
                    <li>• Template sharing & collaboration</li>
                    <li>• Version control & history</li>
                    <li>• Export & import functionality</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">Currently using default templates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;