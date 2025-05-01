import React from 'react';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ children, onClick, disabled, isLoading }) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={disabled || isLoading}
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 flex justify-center items-center"
  >
    {isLoading && <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-white rounded-full" />}
    {children}
  </button>
);

export default PrimaryButton;