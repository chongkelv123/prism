// src/components/feature-specific/landing/FeaturesSection.tsx
import React from 'react';

const features = [
  { title: 'Automated Transformation', description: 'Convert project data into polished PowerPoint reports automatically' },
  { title: 'Multi-Platform Integration', description: 'Seamlessly connects with Monday.com, Jira, and TROFOS' },
  { title: 'Real-Time Synchronization', description: 'Ensures reports always reflect the latest project status' },
];

const FeaturesSection: React.FC = () => (
  <section className="py-16 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Key Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map(f => (
          <div key={f.title} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{f.title}</h3>
            <p className="text-gray-600">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
