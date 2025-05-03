import React, { useState, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import TemplatesHeader from '../components/feature-specific/templates/TemplatesHeader';
import TemplatesOverview from '../components/feature-specific/templates/TemplatesOverview';
import TemplatesTabs, { TemplatesTabType } from '../components/feature-specific/templates/TemplatesTabs';
import TemplatesList from '../components/feature-specific/templates/TemplatesList';
import { Template } from '../components/feature-specific/templates/TemplateCard';

const TemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TemplatesTabType>('default');
  
  // Example stats data - in a real app, this would come from an API
  const stats = [
    { title: 'Default Templates', value: 5 },
    { title: 'Custom Templates', value: 0 },
    { title: 'Reports Generated', value: 0 }
  ];
  
  // Example templates data - in a real app, this would come from an API
  const defaultTemplates: Template[] = Array.from({ length: 5 }).map((_, index) => ({
    id: `default-${index + 1}`,
    title: `Default Template ${index + 1}`,
    description: 'Basic project status template',
    type: 'default'
  }));
  
  const customTemplates: Template[] = [];
  const isLoading = false;
  
  const handleCreateTemplate = useCallback(() => {
    // In a real app, this would open a template creation modal or navigate to a form
    console.log('Create template clicked');
  }, []);
  
  const handleSelectTemplate = useCallback((template: Template) => {
    // In a real app, this would open the template details or preview
    console.log('Template selected:', template);
  }, []);
  
  const displayedTemplates = activeTab === 'default' ? defaultTemplates : customTemplates;
  
  return (
    <MainLayout>
      <TemplatesHeader onCreateTemplate={handleCreateTemplate} />
      <TemplatesOverview stats={stats} />
      <TemplatesTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <TemplatesList 
        templates={displayedTemplates} 
        isLoading={isLoading} 
        activeTab={activeTab} 
        onCreateTemplate={handleCreateTemplate} 
        onSelectTemplate={handleSelectTemplate} 
      />
    </MainLayout>
  );
};

export default TemplatesPage;