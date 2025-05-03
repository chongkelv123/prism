import React from 'react';
import DashboardSection from '../../feature-specific/dashboard/DashboardSection';
import TemplateCard, { Template } from './TemplateCard';
import TemplatesEmptyState from './TemplatesEmptyState';

interface TemplatesListProps {
  templates: Template[];
  isLoading: boolean;
  activeTab: 'default' | 'custom';
  onCreateTemplate: () => void;
  onSelectTemplate: (template: Template) => void;
}

const TemplatesList: React.FC<TemplatesListProps> = ({
  templates,
  isLoading,
  activeTab,
  onCreateTemplate,
  onSelectTemplate
}) => {
  const title = activeTab === 'default' ? 'Default Templates' : 'Custom Templates';

  if (isLoading) {
    return (
      <DashboardSection title={title}>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
        </div>
      </DashboardSection>
    );
  }

  if (templates.length === 0) {
    return (
      <DashboardSection title={title}>
        <TemplatesEmptyState onCreateTemplate={onCreateTemplate} />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title={title}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            onSelect={onSelectTemplate} 
          />
        ))}
      </div>
    </DashboardSection>
  );
};

export default TemplatesList;