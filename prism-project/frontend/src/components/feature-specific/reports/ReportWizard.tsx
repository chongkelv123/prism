// frontend/src/components/feature-specific/reports/ReportWizard.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, CheckCircle, Clock, X, AlertCircle, Loader } from 'lucide-react';
import reportService from '../../../services/report.service';
import { useConnections } from '../../../contexts/ConnectionsContext';

const ReportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    connectionId: '',
    projectId: '',
    templateId: '',
    configuration: {}
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const { connections, getProjectData } = useConnections();
  const totalSteps = 4;

  // Filter only connected platforms
  const connectedPlatforms = connections.filter(conn => conn.status === 'connected');

  useEffect(() => {
    if (wizardData.connectionId && currentStep === 2) {
      loadProjectsForConnection();
    }
  }, [wizardData.connectionId, currentStep]);

  const loadProjectsForConnection = async () => {
    if (!wizardData.connectionId) return;

    setIsLoadingProjects(true);
    try {
      const projectData = await getProjectData(wizardData.connectionId);
      
      // Handle both single project and array of projects
      const projects = Array.isArray(projectData) ? projectData : [projectData];
      setAvailableProjects(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setAvailableProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const updateWizardData = (key: string, value: any) => {
    setWizardData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      if (generationComplete) {
        handleDownload();
      } else if (generationError) {
        setGenerationError(false);
        setIsGenerating(false);
        handleGenerateReport();
      } else {
        handleGenerateReport();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      // Get selected connection and project data
      const selectedConnection = connections.find(c => c.id === wizardData.connectionId);
      const selectedProject = availableProjects.find(p => p.id === wizardData.projectId);
      
      if (!selectedConnection || !selectedProject) {
        throw new Error('Invalid connection or project selection');
      }

      // Create report title based on connection and project
      const reportTitle = wizardData.configuration.title || 
        `${selectedProject.name} - ${selectedConnection.name} Report`;

      const report = await reportService.generateReport({
        platformId: selectedConnection.platform,
        templateId: wizardData.templateId,
        configuration: {
          ...wizardData.configuration,
          title: reportTitle,
          connectionId: wizardData.connectionId,
          projectId: wizardData.projectId,
          connectionName: selectedConnection.name,
          projectName: selectedProject.name
        }
      });

      setReportId(report.id);

      // Poll for report generation status
      const checkStatus = async () => {
        try {
          const status = await reportService.getReportStatus(report.id);

          if (status.status === 'completed') {
            setGenerationComplete(true);
            setIsGenerating(false);
            addNotification({
              type: 'success',
              title: 'Report Generated',
              message: `Your "${reportTitle}" report is ready to download`,
              actions: [
                { label: 'Download', action: 'download', id: report.id },
                { label: 'View', action: 'view', id: report.id }
              ]
            });
          } else if (status.status === 'failed') {
            setGenerationError(true);
            setIsGenerating(false);
            addNotification({
              type: 'error',
              title: 'Report Generation Failed',
              message: 'There was an error generating your report',
              actions: [
                { label: 'Try Again', action: 'retry', id: report.id }
              ]
            });
          } else {
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Failed to check report status', error);
          setGenerationError(true);
          setIsGenerating(false);
        }
      };

      checkStatus();

    } catch (error) {
      console.error('Failed to generate report', error);
      setGenerationError(true);
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (reportId) {
      // Get real project data for the report
      const selectedProject = availableProjects.find(p => p.id === wizardData.projectId);
      const selectedConnection = connections.find(c => c.id === wizardData.connectionId);
      
      const reportData = {
        title: wizardData.configuration.title || `${selectedProject?.name} Report`,
        platform: selectedConnection?.platform,
        connectionName: selectedConnection?.name,
        projectName: selectedProject?.name,
        date: new Date().toLocaleDateString(),
        metrics: selectedProject?.metrics || [],
        team: selectedProject?.team || [],
        tasks: selectedProject?.tasks || [],
        configuration: wizardData.configuration
      };

      reportService.downloadReport(reportId, reportData);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ConnectionSelection
            connections={connectedPlatforms}
            selectedConnectionId={wizardData.connectionId}
            onSelectConnection={(connectionId) => updateWizardData('connectionId', connectionId)}
          />
        );
      case 2:
        return (
          <ProjectSelection
            projects={availableProjects}
            isLoading={isLoadingProjects}
            selectedProjectId={wizardData.projectId}
            onSelectProject={(projectId) => updateWizardData('projectId', projectId)}
            connectionName={connections.find(c => c.id === wizardData.connectionId)?.name}
          />
        );
      case 3:
        return (
          <TemplateSelection
            selectedTemplate={wizardData.templateId}
            onSelectTemplate={(template) => updateWizardData('templateId', template)}
          />
        );
      case 4:
        return (
          <ReportConfiguration
            configuration={wizardData.configuration}
            onUpdateConfiguration={(config) => updateWizardData('configuration', config)}
            connectionName={connections.find(c => c.id === wizardData.connectionId)?.name}
            projectName={availableProjects.find(p => p.id === wizardData.projectId)?.name}
          />
        );
      case 5:
        return (
          <GenerationProgress
            isGenerating={isGenerating}
            isComplete={generationComplete}
            hasError={generationError}
            onRetry={() => {
              setGenerationError(false);
              setIsGenerating(false);
              handleGenerateReport();
            }}
            onDownload={handleDownload}
          />
        );
      default:
        return null;
    }
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return !!wizardData.connectionId;
      case 2:
        return !!wizardData.projectId;
      case 3:
        return !!wizardData.templateId;
      case 4:
        return Object.keys(wizardData.configuration).length > 0;
      case 5:
        return !isGenerating || generationComplete || generationError;
      default:
        return false;
    }
  };

  const getButtonText = () => {
    if (currentStep === 5) {
      if (!isGenerating && !generationComplete && !generationError) {
        return 'Generate Report';
      } else if (generationComplete) {
        return 'Download Report';
      } else if (generationError) {
        return 'Try Again';
      }
      return 'Generating...';
    }
    return currentStep === 4 ? 'Generate Report' : 'Continue';
  };

  const actualTotalSteps = 5; // Updated to include generation step

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">
      {/* Wizard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Report</h1>
        <p className="text-gray-600">Generate PowerPoint reports from your connected platforms</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {Array.from({ length: actualTotalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = stepNum < currentStep || (stepNum === currentStep && isStepComplete(stepNum));

            return (
              <div key={idx} className="flex flex-col items-center relative">
                {idx < actualTotalSteps - 1 && (
                  <div
                    className={`absolute w-full h-1 top-4 left-1/2 -z-10 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${isActive || isDone ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {isDone && stepNum < currentStep ? <Check size={16} /> : stepNum}
                </div>
                <span className={`text-sm mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {stepNum === 1 && 'Connection'}
                  {stepNum === 2 && 'Project'}
                  {stepNum === 3 && 'Template'}
                  {stepNum === 4 && 'Configure'}
                  {stepNum === 5 && 'Generate'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-64 mb-8">
        {renderStepContent()}
      </div>

      {/* Wizard Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={handleBack}
          disabled={currentStep === 1 || isGenerating}
          className={`flex items-center px-4 py-2 rounded-lg 
            ${currentStep === 1 || isGenerating ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!isStepComplete(currentStep) || (isGenerating && !generationComplete && !generationError)}
          className={`flex items-center px-6 py-2 rounded-lg 
            ${!isStepComplete(currentStep) || (isGenerating && !generationComplete && !generationError)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {getButtonText()}
          {currentStep < 4 && <ArrowRight size={16} className="ml-1" />}
          {currentStep === 5 && generationComplete && <Check size={16} className="ml-1" />}
        </button>
      </div>
    </div>
  );
};

// Connection Selection Component
const ConnectionSelection: React.FC<{
  connections: any[],
  selectedConnectionId: string,
  onSelectConnection: (connectionId: string) => void
}> = ({ connections, selectedConnectionId, onSelectConnection }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'monday': return '📊';
      case 'jira': return '🔄';
      case 'trofos': return '📈';
      default: return '🔗';
    }
  };

  if (connections.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Platforms</h3>
        <p className="text-gray-600 mb-4">
          You need to connect to a platform before generating reports.
        </p>
        <button
          onClick={() => window.location.href = '/connections'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Connect a Platform
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Connection</h2>
      <p className="text-gray-600 mb-6">Choose which platform connection to use for your report</p>
      
      <div className="space-y-3">
        {connections.map((connection) => (
          <div
            key={connection.id}
            onClick={() => onSelectConnection(connection.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedConnectionId === connection.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getPlatformIcon(connection.platform)}</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{connection.name}</h3>
                <p className="text-sm text-gray-500">
                  {connection.platform} • {connection.projectCount} project{connection.projectCount !== 1 ? 's' : ''}
                </p>
              </div>
              {selectedConnectionId === connection.id && (
                <CheckCircle size={20} className="text-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Project Selection Component
const ProjectSelection: React.FC<{
  projects: any[],
  isLoading: boolean,
  selectedProjectId: string,
  onSelectProject: (projectId: string) => void,
  connectionName?: string
}> = ({ projects, isLoading, selectedProjectId, onSelectProject, connectionName }) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
        <p className="text-gray-600">Loading projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
        <p className="text-gray-600">
          No projects were found in your {connectionName} connection.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Project</h2>
      <p className="text-gray-600 mb-6">
        Choose the project from {connectionName} to include in your report
      </p>
      
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedProjectId === project.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                )}
                <div className="flex items-center mt-2 space-x-4">
                  {project.tasks && (
                    <span className="text-xs text-gray-500">
                      {project.tasks.length} tasks
                    </span>
                  )}
                  {project.team && (
                    <span className="text-xs text-gray-500">
                      {project.team.length} team members
                    </span>
                  )}
                </div>
              </div>
              {selectedProjectId === project.id && (
                <CheckCircle size={20} className="text-blue-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Template Selection Component
const TemplateSelection: React.FC<{
  selectedTemplate: string,
  onSelectTemplate: (template: string) => void
}> = ({ selectedTemplate, onSelectTemplate }) => {
  const templates = [
    {
      id: 'standard-report',
      name: 'Standard Project Report',
      description: 'A comprehensive overview including metrics, tasks, and team information',
      features: ['Project Overview', 'Team Members', 'Task Status', 'Metrics Dashboard']
    },
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      description: 'High-level overview perfect for stakeholder presentations',
      features: ['Key Metrics', 'Project Status', 'Critical Issues', 'Next Steps']
    },
    {
      id: 'detailed-analysis',
      name: 'Detailed Analysis',
      description: 'In-depth analysis with detailed charts and breakdowns',
      features: ['Detailed Metrics', 'Task Breakdown', 'Timeline Analysis', 'Resource Allocation']
    }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Template</h2>
      <p className="text-gray-600 mb-6">Select the report template that best fits your needs</p>
      
      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-gray-600 mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-2">
                  {template.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              {selectedTemplate === template.id && (
                <CheckCircle size={20} className="text-blue-500 ml-4" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Report Configuration Component
const ReportConfiguration: React.FC<{
  configuration: any,
  onUpdateConfiguration: (config: any) => void,
  connectionName?: string,
  projectName?: string
}> = ({ configuration, onUpdateConfiguration, connectionName, projectName }) => {
  const [config, setConfig] = useState({
    title: '',
    includeMetrics: true,
    includeTasks: true,
    includeTimeline: true,
    includeResources: true,
    dateRange: '30',
    ...configuration
  });

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdateConfiguration(newConfig);
  };

  // Set default title if empty
  React.useEffect(() => {
    if (!config.title && projectName && connectionName) {
      const defaultTitle = `${projectName} - ${connectionName} Report`;
      handleConfigChange('title', defaultTitle);
    }
  }, [projectName, connectionName]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Configure Report</h2>
      <p className="text-gray-600 mb-6">Customize your report settings and content</p>
      
      <div className="space-y-6">
        {/* Report Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => handleConfigChange('title', e.target.value)}
            placeholder={`${projectName} - ${connectionName} Report`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Include in Report
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeMetrics}
                onChange={(e) => handleConfigChange('includeMetrics', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Project Metrics & Statistics</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeTasks}
                onChange={(e) => handleConfigChange('includeTasks', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Task List & Status</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeTimeline}
                onChange={(e) => handleConfigChange('includeTimeline', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Timeline & Milestones</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeResources}
                onChange={(e) => handleConfigChange('includeResources', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Team & Resources</span>
            </label>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Range (Days)
          </label>
          <select
            value={config.dateRange}
            onChange={(e) => handleConfigChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Generation Progress Component
const GenerationProgress: React.FC<{
  isGenerating: boolean,
  isComplete: boolean,
  hasError: boolean,
  onRetry: () => void,
  onDownload: () => void
}> = ({ isGenerating, isComplete, hasError, onRetry, onDownload }) => {
  if (hasError) {
    return (
      <div className="text-center py-8">
        <X size={48} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Failed</h3>
        <p className="text-gray-600 mb-4">
          There was an error generating your report. Please try again.
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Report Generated Successfully!</h3>
        <p className="text-gray-600 mb-4">
          Your PowerPoint report is ready for download.
        </p>
        <button
          onClick={onDownload}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Download Report
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-8">
        <div className="relative">
          <Clock size={48} className="mx-auto text-blue-500 mb-4 animate-spin" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Report...</h3>
        <p className="text-gray-600 mb-4">
          Please wait while we create your PowerPoint report. This may take a few moments.
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <FileText size={48} className="mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
      <p className="text-gray-600">
        Click "Generate Report" to create your PowerPoint presentation.
      </p>
    </div>
  );
};

export default ReportWizard;