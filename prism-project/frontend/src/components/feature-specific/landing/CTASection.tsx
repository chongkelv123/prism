// src/components/feature-specific/landing/CTASection.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CTASection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-16 bg-blue-600 text-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-8">
          Ready to streamline your reporting process?
        </h2>
        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold">
          Start Free Trial
        </button>
      </div>
    </section>
  );
};

export default CTASection;
