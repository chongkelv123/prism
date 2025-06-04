// src/components/layout/Header.tsx - UPDATED VERSION
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span
          className="text-2xl font-bold text-blue-600 cursor-pointer"
          onClick={() => navigate('/landing')} // Changed from '/' to '/landing'
        >
          PRISM
        </span>
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/login')} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Sign in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;