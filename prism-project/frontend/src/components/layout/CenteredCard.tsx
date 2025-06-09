import React, { ReactNode } from 'react';

interface CenteredCardProps {
  children: ReactNode;
}

const CenteredCard: React.FC<CenteredCardProps> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      {children}
    </div>
  </div>
);

export default CenteredCard;