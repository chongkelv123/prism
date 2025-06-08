// frontend/src/pages/ConnectionsPage.tsx - UPDATED VERSION
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import SimpleJiraConnection from '../components/feature-specific/connections/SimpleJiraConnection';

const ConnectionsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect to Jira
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Simple, reliable Jira connection using the same approach as your working PowerShell script. 
            No complex routing, no redirects - just direct API connection testing.
          </p>
        </div>

        {/* Simple Connection Form - REPLACES THE COMPLEX FORM */}
        <SimpleJiraConnection />

        {/* Troubleshooting Tips */}
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Troubleshooting Tips
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="font-medium text-red-600 mr-2">•</span>
              <div>
                <strong>401 Unauthorized:</strong> Check your email and API token. 
                Make sure the API token is not expired.
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-red-600 mr-2">•</span>
              <div>
                <strong>404 Project Not Found:</strong> Verify the project key exists 
                and you have access to it.
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-red-600 mr-2">•</span>
              <div>
                <strong>CORS Error:</strong> This is normal when testing from localhost. 
                The connection will work in production.
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ConnectionsPage;