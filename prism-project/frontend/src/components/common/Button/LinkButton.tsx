import React from 'react';
import { Link } from 'react-router-dom';

interface LinkButtonProps {
  to: string;
  children: React.ReactNode;
}

const LinkButton: React.FC<LinkButtonProps> = ({ to, children }) => (
  <Link to={to} className="text-blue-600 hover:underline text-sm">
    {children}
  </Link>
);

export default LinkButton;