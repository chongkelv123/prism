import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import UserMenu from './UserMenu';
import SearchBar from '../common/SearchBar';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-blue-600"
          >
            PRISM
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl px-8">
            <SearchBar />
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;