import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/feature-specific/landing/HeroSection';
import FeaturesSection from '../components/feature-specific/landing/FeaturesSection';
import CTASection from '../components/feature-specific/landing/CTASection';

const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
    <Header />
    <main className="flex-grow">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </main>
    <Footer />
  </div>
);

export default LandingPage;
