// src/components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-gray-300 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* top grid */}
      {/* …identical markup from original file… */}
      <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} PRISM. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
