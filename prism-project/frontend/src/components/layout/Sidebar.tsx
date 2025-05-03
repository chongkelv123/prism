import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, FolderKanban, Layout } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  
  const navItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/' },
    { icon: <FileText size={18} />, label: 'Reports', path: '/reports' },
    { icon: <FolderKanban size={18} />, label: 'Projects', path: '/projects' },
    { icon: <Layout size={18} />, label: 'Templates', path: '/templates' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 pt-5">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          className="flex items-center w-full px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          {item.icon}
          <span className="ml-3">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Sidebar;