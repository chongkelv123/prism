// frontend/src/components/feature-specific/connections/PlatformSelector.tsx
import React from 'react';
import { ExternalLink } from 'lucide-react';

type Platform = 'monday' | 'jira' | 'trofos';

interface PlatformSelectorProps {
  onPlatformSelect: (platform: Platform) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onPlatformSelect }) => {
  const platforms = [
    {
      id: 'monday' as Platform,
      name: 'Monday.com',
      description: 'Connect to your Monday.com workspace to sync boards, items, and project data.',
      icon: '📊',
      color: 'border-orange-200 hover:border-orange-400',
      bgColor: 'bg-orange-50',
      features: ['Boards & Items', 'Status Updates', 'Team Members', 'Time Tracking']
    },
    {
      id: 'jira' as Platform,
      name: 'Jira',
      description: 'Integrate with Jira to pull issues, sprints, and project metrics.',
      icon: '🔄',
      color: 'border-blue-200 hover:border-blue-400',
      bgColor: 'bg-blue-50',
      features: ['Issues & Epics', 'Sprint Data', 'Story Points', 'Workflow Status']
    },
    {
      id: 'trofos' as Platform,
      name: 'TROFOS',
      description: 'Connect to TROFOS for comprehensive project and resource management data.',
      icon: '📈',
      color: 'border-green-200 hover:border-green-400',
      bgColor: 'bg-green-50',
      features: ['Project Metrics', 'Resource Allocation', 'Backlog Items', 'Sprint Progress']
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select Platform
        </h3>
        <p className="text-gray-600">
          Choose which project management platform you'd like to connect to PRISM
        </p>
      </div>

      <div className="grid gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            onClick={() => onPlatformSelect(platform.id)}
            className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${platform.color} ${platform.bgColor} hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-3xl">{platform.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {platform.name}
                    </h4>
                    <ExternalLink size={16} className="ml-2 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-3">
                    {platform.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {platform.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white bg-opacity-60 text-xs font-medium text-gray-700 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">
              Secure Connection
            </h5>
            <p className="text-xs text-blue-700">
              All connections use secure authentication methods and your credentials are encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSelector;