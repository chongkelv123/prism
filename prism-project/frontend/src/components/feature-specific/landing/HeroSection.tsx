// src/components/feature-specific/landing/HeroSection.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-8">
        PowerPoint Report Integration &amp;
        <span className="block text-blue-600">Synchronization Manager</span>
      </h1>
      <p className="max-w-3xl mx-auto text-xl text-gray-600 mb-12">
        Automate your PowerPoint report generation from Monday.com, Jira, and TROFOS.
        Save time and eliminate errors with our intelligent integration system.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold">
          Get Started
        </button>
        <button onClick={() => navigate('/demo')} className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors text-lg font-semibold border-2 border-blue-600">
          Watch Demo
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
