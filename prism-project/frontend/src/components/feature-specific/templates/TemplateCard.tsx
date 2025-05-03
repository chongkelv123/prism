import React from 'react';
import { Layout } from 'lucide-react';

export interface Template {
  id: string;
  title: string;
  description: string;
  type: 'default' | 'custom';
  thumbnail?: string;
}

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => (
  <div 
    className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => onSelect(template)}
  >
    <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center mb-4">
      {template.thumbnail ? (
        <img 
          src={template.thumbnail} 
          alt={template.title} 
          className="w-full h-full object-cover rounded-md"
        />
      ) : (
        <Layout size={32} className="text-gray-400" />
      )}
    </div>
    <h3 className="font-medium text-gray-900">{template.title}</h3>
    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
  </div>
);

export default TemplateCard;