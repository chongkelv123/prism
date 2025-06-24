// frontend/src/components/feature-specific/reports/EnhancedTemplateSelection.tsx
// Enhanced Template Selection with Real Data Previews - Windows Compatible (No Unicode/Symbols)

import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, Layers, Clock, Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';

// Template type interfaces
interface TemplatePreview {
  id: 'standard' | 'executive' | 'detailed';
  name: string;
  description: string;
  icon: React.ReactNode;
  slideCount: number;
  estimatedTime: number;
  targetAudience: string[];
  features: string[];
  complexity: 'Basic' | 'Intermediate' | 'Advanced';
  dataRequirements: string[];
  preview: {
    keyMetrics: string[];
    sampleSlides: string[];
    chartTypes: string[];
  };
}

interface ProjectData {
  id: string;
  name: string;
  platform: string;
  tasks?: any[];
  team?: any[];
  metrics?: any[];
  sprints?: any[];
  status?: string;
}

interface EnhancedTemplateSelectionProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  projectData?: ProjectData;
  isLoading?: boolean;
}

const EnhancedTemplateSelection: React.FC<EnhancedTemplateSelectionProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  projectData,
  isLoading = false
}) => {
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  // Calculate real data metrics for previews
  useEffect(() => {
    if (projectData) {
      const calculatedPreview = {
        taskCount: projectData.tasks?.length || 0,
        teamSize: projectData.team?.length || 0,
        completionRate: calculateCompletionRate(projectData),
        metricsCount: projectData.metrics?.length || 0,
        sprintCount: projectData.sprints?.length || 0,
        platform: projectData.platform,
        hasRichData: (projectData.tasks?.length || 0) > 5 && (projectData.team?.length || 0) > 2
      };
      setPreviewData(calculatedPreview);
    }
  }, [projectData]);

  // Template definitions with dynamic content based on real data
  const templates: TemplatePreview[] = [
    {
      id: 'standard',
      name: 'Standard Report',
      description: 'Comprehensive project overview with balanced detail for project managers and stakeholders',
      icon: <BarChart3 className="w-8 h-8" />,
      slideCount: 8 + (previewData?.sprintCount > 0 ? 2 : 0) + (previewData?.teamSize > 5 ? 1 : 0),
      estimatedTime: 45,
      targetAudience: ['Project Managers', 'Team Leads', 'Stakeholders', 'Product Owners'],
      complexity: 'Intermediate',
      features: [
        'Project Overview & Status',
        'Key Metrics Dashboard',
        'Task Analysis & Progress',
        'Team Performance Review',
        'Timeline & Milestone Tracking',
        'Risk Assessment',
        'Progress Summary',
        'Next Steps & Recommendations'
      ],
      dataRequirements: [
        'Task/Issue data',
        'Team assignments',
        'Project metrics',
        'Status tracking'
      ],
      preview: {
        keyMetrics: previewData ? [
          `${previewData.taskCount} tasks analyzed`,
          `${previewData.teamSize} team members`,
          `${previewData.completionRate}% completion rate`,
          `${previewData.platform.toUpperCase()} platform data`
        ] : ['Tasks analyzed', 'Team performance', 'Completion metrics', 'Platform insights'],
        sampleSlides: [
          'Executive Summary',
          'Project Health Dashboard',
          'Task Status Analysis',
          'Team Workload Distribution',
          'Risk & Mitigation Plan'
        ],
        chartTypes: ['Bar Charts', 'Pie Charts', 'Progress Indicators', 'Status Tables']
      }
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level strategic overview designed for C-level executives and senior management',
      icon: <Target className="w-8 h-8" />,
      slideCount: 5 + (previewData?.metricsCount > 5 ? 1 : 0) + (previewData?.taskCount > 50 ? 1 : 0),
      estimatedTime: 30,
      targetAudience: ['C-Level Executives', 'Senior Management', 'Board Members', 'Investors'],
      complexity: 'Basic',
      features: [
        'Executive Summary',
        'Project Health Dashboard',
        'Strategic Progress Overview',
        'Resource Allocation Summary',
        'Risk Summary & Mitigation',
        'Key Decisions Required'
      ],
      dataRequirements: [
        'High-level metrics',
        'Project status',
        'Risk indicators',
        'Resource data'
      ],
      preview: {
        keyMetrics: previewData ? [
          `Project Health: ${getHealthStatus(previewData.completionRate)}`,
          `${previewData.teamSize} resources engaged`,
          `${previewData.metricsCount} KPIs tracked`,
          `Risk Level: ${getRiskLevel(previewData)}`
        ] : ['Project health score', 'Resource utilization', 'Strategic KPIs', 'Risk assessment'],
        sampleSlides: [
          'Strategic Overview',
          'Health Dashboard',
          'Key Performance Indicators',
          'Critical Decisions',
          'Executive Recommendations'
        ],
        chartTypes: ['KPI Dashboards', 'Health Indicators', 'Trend Charts', 'Risk Matrix']
      }
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive analytical report with deep insights for technical teams and analysts',
      icon: <Layers className="w-8 h-8" />,
      slideCount: 15 + (previewData?.sprintCount > 2 ? 3 : 0) + (previewData?.teamSize > 3 ? 2 : 0) + (previewData?.taskCount > 20 ? 2 : 0),
      estimatedTime: 90,
      targetAudience: ['Technical Leads', 'Data Analysts', 'Project Coordinators', 'Process Managers'],
      complexity: 'Advanced',
      features: [
        'Comprehensive Data Analysis',
        'Performance Trend Analysis',
        'Quality Metrics Deep-dive',
        'Team Analytics & Workload',
        'Bottleneck Identification',
        'Predictive Insights',
        'Benchmarking Analysis',
        'Detailed Recommendations',
        'Statistical Analysis',
        'Process Optimization'
      ],
      dataRequirements: [
        'Complete task history',
        'Team performance data',
        'Quality metrics',
        'Timeline data',
        'Sprint information'
      ],
      preview: {
        keyMetrics: previewData ? [
          `${previewData.taskCount} data points analyzed`,
          `${previewData.sprintCount} sprints evaluated`,
          `${previewData.teamSize} team members profiled`,
          `${previewData.hasRichData ? 'Rich' : 'Basic'} dataset available`
        ] : ['Comprehensive data analysis', 'Performance trends', 'Quality assessments', 'Predictive modeling'],
        sampleSlides: [
          'Data Overview & Statistics',
          'Performance Trend Analysis',
          'Quality Metrics Deep-dive',
          'Team Analytics Matrix',
          'Bottleneck Analysis',
          'Predictive Insights',
          'Benchmarking Results'
        ],
        chartTypes: ['Advanced Analytics', 'Trend Analysis', 'Heat Maps', 'Statistical Charts', 'Predictive Models']
      }
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    onSelectTemplate(templateId);
    setSelectedPreview(templateId);
  };

  const calculateCompletionRate = (data: ProjectData): number => {
    const tasks = data.tasks || [];
    if (tasks.length === 0) return 0;
    
    const completed = tasks.filter(task => 
      ['done', 'completed', 'closed', 'resolved'].includes(task.status?.toLowerCase() || '')
    ).length;
    
    return Math.round((completed / tasks.length) * 100);
  };

  const getHealthStatus = (completionRate: number): string => {
    return completionRate >= 80 ? 'EXCELLENT' : 
           completionRate >= 60 ? 'GOOD' : 
           completionRate >= 40 ? 'FAIR' : 'NEEDS ATTENTION';
  };

  const getRiskLevel = (data: any): string => {
    if (!data) return 'LOW';
    const taskCount = data.taskCount || 0;
    const completionRate = data.completionRate || 0;
    
    if (completionRate < 50 || taskCount > 100) return 'HIGH';
    if (completionRate < 75 || taskCount > 50) return 'MEDIUM';
    return 'LOW';
  };

  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case 'Basic': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemplateColor = (templateId: string): string => {
    switch (templateId) {
      case 'standard': return 'border-blue-500 bg-blue-50';
      case 'executive': return 'border-purple-500 bg-purple-50';
      case 'detailed': return 'border-indigo-500 bg-indigo-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading template options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Report Template</h2>
        <p className="text-gray-600 mb-4">
          Choose the template that best matches your audience and reporting needs
        </p>
        {previewData && (
          <div className="inline-flex items-center space-x-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
            <span className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              {previewData.taskCount} tasks
            </span>
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {previewData.teamSize} members
            </span>
            <span className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              {previewData.completionRate}% complete
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              {previewData.platform.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
              selectedTemplateId === template.id
                ? getTemplateColor(template.id) + ' shadow-lg scale-105'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Template Card Header */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${
                    selectedTemplateId === template.id 
                      ? 'bg-white bg-opacity-80' 
                      : 'bg-gray-100'
                  }`}>
                    {template.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(template.complexity)}`}>
                      {template.complexity}
                    </span>
                  </div>
                </div>
                {selectedTemplateId === template.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-4">{template.description}</p>

              {/* Template Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <FileText className="w-4 h-4 text-gray-600 mr-1" />
                    <span className="text-lg font-semibold text-gray-900">{template.slideCount}</span>
                  </div>
                  <span className="text-xs text-gray-600">Slides</span>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-gray-600 mr-1" />
                    <span className="text-lg font-semibold text-gray-900">{template.estimatedTime}</span>
                  </div>
                  <span className="text-xs text-gray-600">Minutes</span>
                </div>
              </div>

              {/* Target Audience */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Target Audience</h4>
                <div className="flex flex-wrap gap-1">
                  {template.targetAudience.slice(0, 2).map((audience, index) => (
                    <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {audience}
                    </span>
                  ))}
                  {template.targetAudience.length > 2 && (
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      +{template.targetAudience.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              {/* Key Features Preview */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {template.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                  {template.features.length > 4 && (
                    <li className="text-gray-500 italic">+{template.features.length - 4} more features</li>
                  )}
                </ul>
              </div>

              {/* Real Data Preview */}
              {previewData && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Your Data Preview</h4>
                  <div className="space-y-2">
                    {template.preview.keyMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center text-xs text-gray-600">
                        <TrendingUp className="w-3 h-3 mr-2 text-green-500" />
                        {metric}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Preview Section */}
            {selectedPreview === template.id && (
              <div className="border-t bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Template Preview</h4>
                
                <div className="space-y-4">
                  {/* Sample Slides */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Sample Slides Include:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {template.preview.sampleSlides.map((slide, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border text-gray-600">
                          {slide}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart Types */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Visualization Types:</h5>
                    <div className="flex flex-wrap gap-1">
                      {template.preview.chartTypes.map((chart, index) => (
                        <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {chart}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Data Requirements */}
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Data Requirements:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {template.dataRequirements.map((req, index) => (
                        <li key={index} className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            checkDataAvailability(req, previewData) ? 'bg-green-400' : 'bg-yellow-400'
                          }`}></div>
                          {req}
                          {!checkDataAvailability(req, previewData) && (
                            <span className="ml-1 text-yellow-600">(Limited)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Selection Indicator */}
            {selectedTemplateId === template.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Comparison */}
      {selectedTemplateId && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Selected: {templates.find(t => t.id === selectedTemplateId)?.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Complexity:</span>
              <span className="ml-2 text-blue-700">
                {templates.find(t => t.id === selectedTemplateId)?.complexity}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Estimated Time:</span>
              <span className="ml-2 text-blue-700">
                {templates.find(t => t.id === selectedTemplateId)?.estimatedTime} minutes
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Slide Count:</span>
              <span className="ml-2 text-blue-700">
                {templates.find(t => t.id === selectedTemplateId)?.slideCount} slides
              </span>
            </div>
          </div>
          {previewData && !previewData.hasRichData && (
            <div className="mt-3 flex items-center text-amber-700 bg-amber-100 p-3 rounded">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="text-sm">
                Limited data available. Some advanced features may show placeholder content.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  function checkDataAvailability(requirement: string, data: any): boolean {
    if (!data) return false;
    
    switch (requirement.toLowerCase()) {
      case 'task/issue data':
      case 'complete task history':
        return data.taskCount > 0;
      case 'team assignments':
      case 'team performance data':
        return data.teamSize > 0;
      case 'project metrics':
      case 'high-level metrics':
        return data.metricsCount > 0;
      case 'sprint information':
        return data.sprintCount > 0;
      case 'status tracking':
      case 'timeline data':
        return data.taskCount > 0;
      case 'quality metrics':
        return data.hasRichData;
      case 'risk indicators':
      case 'resource data':
        return true; // Always available from calculated data
      default:
        return true;
    }
  }
};

export default EnhancedTemplateSelection;