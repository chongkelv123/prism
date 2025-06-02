import React from 'react';
import { FileText, Layout, Link, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  
  const actions = [
    { 
      title: 'Create Report', 
      icon: <FileText size={24} />, 
      description: 'Generate a new PowerPoint report',
      onClick: () => navigate('/reports/create'),
      primary: true
    },
    { 
      title: 'Manage Templates', 
      icon: <Layout size={24} />, 
      description: 'View and customize report templates',
      onClick: () => navigate('/templates')
    },
    { 
      title: 'Connect Platform', 
      icon: <Link size={24} />, 
      description: 'Add a new project management tool',
      onClick: () => navigate('/connections')
    },
    { 
      title: 'Settings', 
      icon: <Settings size={24} />, 
      description: 'Configure your account preferences',
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <div className="mt-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <div 
            key={action.title}
            onClick={action.onClick}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              action.primary 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-3 ${action.primary ? 'bg-blue-500' : 'bg-blue-50'}`}>
                {React.cloneElement(action.icon, { 
                  color: action.primary ? 'white' : '#3b82f6' 
                })}
              </div>
              <h3 className="font-medium mb-1">{action.title}</h3>
              <p className={`text-sm ${action.primary ? 'text-blue-100' : 'text-gray-500'}`}>
                {action.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;