import React from 'react';

const CenteredCard: React.FC = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      {children}
    </div>
  </div>
);

export default CenteredCard;