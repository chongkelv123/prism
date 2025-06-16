// frontend/src/components/feature-specific/reports/ReportWizard.tsx - COMPLETE FIXED VERSION
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

  const { connections, getProjectData, isLoading: connectionsLoading, error: connectionsError } = useConnections();
  const totalSteps = 4;

  // DEBUGGING: Add comprehensive logging
  useEffect(() => {
    console.log('🔍 ReportWizard Debug Info:');
    console.log('  - Total connections:', connections.length);
    console.log('  - Connections loading:', connectionsLoading);
    console.log('  - Connections error:', connectionsError);
    console.log('  - Raw connections:', connections);

    if (connections.length > 0) {
      console.log('  - Connection statuses:', connections.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        platform: c.platform
      })));
    }

    const connected = connections.filter(conn => conn.status === 'connected');
    console.log('  - Connected platforms:', connected.length);
    console.log('  - Connected details:', connected);

    // Check if there's a mismatch between total and connected
    if (connections.length > 0 && connected.length === 0) {
      console.warn('STATUS MISMATCH: Connections exist but none are "connected"');
      console.warn('   Connection statuses:', connections.map(c => `${c.name}: "${c.status}"`));
      console.warn('   Expected status: "connected"');
    }
  }, [connections, connectionsLoading, connectionsError]);

  // Filter only connected platforms with additional validation
  const connectedPlatforms = connections.filter(conn => {
    const isConnected = conn.status === 'connected';
    if (!isConnected) {
      console.log(`Filtering out connection "${conn.name}" - status: "${conn.status}" (expected: "connected")`);
    } else {
      console.log(`Including connection "${conn.name}" - status: "${conn.status}"`);
    }
    return isConnected;
  });

  // DEBUGGING: Log the filtered result
  useEffect(() => {
    console.log('🎯 ReportWizard connectedPlatforms result:', connectedPlatforms.length);
    if (connectedPlatforms.length === 0 && connections.length > 0) {
      console.warn('⚠️  No connected platforms found but connections exist!');
      console.warn('   This indicates a status field issue.');
      console.warn('   Check connection status values:', connections.map(c => c.status));
    }
  }, [connectedPlatforms, connections]);

  useEffect(() => {
    if (wizardData.connectionId && currentStep === 2) {
      loadProjectsForConnection();
    }
  }, [wizardData.connectionId, currentStep]);

  // ENHANCED PROJECT LOADING WITH DEFENSIVE HANDLING
  const loadProjectsForConnection = async () => {
    if (!wizardData.connectionId) return;

    setIsLoadingProjects(true);

    // 🔍 DEBUG 1: Is this function being called?
    console.log('DEBUG 1 - Loading projects for connection:', wizardData.connectionId);

    try {
      const projectData = await getProjectData(wizardData.connectionId);
      // 🔍 DEBUG 2: What data did we get back?
      console.log('DEBUG 2 - Raw project data:', projectData);
      console.log('📊 Data type:', typeof projectData);
      console.log('📊 Is array:', Array.isArray(projectData));

      // Ensure we have an array
      let projects = Array.isArray(projectData) ? projectData : [projectData];
      console.log('📋 Projects after array conversion:', projects.length, 'items');

      // ROBUST FILTERING: Remove any invalid items and ensure all required properties
      const validProjects = projects
        .filter((project, index) => {
          // Check if project exists and is an object
          if (!project || typeof project !== 'object') {
            console.warn(`⚠️  Project ${index} is not a valid object:`, project);
            return false;
          }

          // Check required properties
          if (!project.id) {
            console.warn(`⚠️  Project ${index} missing 'id':`, project);
            return false;
          }

          if (!project.name) {
            console.warn(`⚠️  Project ${index} missing 'name':`, project);
            return false;
          }

          console.log(`✅ Project ${index} is valid:`, { id: project.id, name: project.name, platform: project.platform });
          return true;
        })
        .map((project, index) => {
          // Ensure all properties exist with fallbacks
          const safeProject = {
            id: String(project.id || `fallback_${Date.now()}_${index}`),
            name: String(project.name || 'Unnamed Project'),
            platform: String(project.platform || 'unknown'),
            description: String(project.description || ''),
            status: String(project.status || 'active'),
            metrics: Array.isArray(project.metrics) ? project.metrics : [],
            team: Array.isArray(project.team) ? project.team : [],
            tasks: Array.isArray(project.tasks) ? project.tasks : [],
            lastUpdated: project.lastUpdated || new Date().toISOString(),
            // Keep all other properties
            ...project
          };

          console.log(`🔧 Processed project ${index}:`, safeProject.id, safeProject.name);
          return safeProject;
        });

      console.log(`✅ Final valid projects count: ${validProjects.length}`);
      console.log('📋 Project IDs:', validProjects.map(p => p.id));
      console.log('📋 Project names:', validProjects.map(p => p.name));

      setAvailableProjects(validProjects);

    } catch (error) {
      // 🔍 DEBUG 3: Any errors?
      console.log('DEBUG 3 - Error loading projects:', error);      
      console.error('❌ Error details:', error.message, error.stack);
      setAvailableProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const updateWizardData = (key: string, value: any) => {
    console.log('🔧 Updating wizard data:', { key, value, currentStep });

    setWizardData(prev => {
      const updated = {
        ...prev,
        [key]: value
      };
      console.log('📊 Wizard data updated:', updated);
      return updated;
    });
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
        platform: selectedConnection.platform,
        connectionId: wizardData.connectionId,
        projectId: wizardData.projectId,
        templateId: wizardData.templateId,
        configuration: {
          ...wizardData.configuration,
          title: reportTitle
        }
      });

      setReportId(report.id);
      setCurrentStep(5);

      // Poll for completion
      const checkStatus = async () => {
        try {
          const status = await reportService.getReportStatus(report.id);

          if (status.status === 'completed') {
            setGenerationComplete(true);
            setIsGenerating(false);
          } else if (status.status === 'failed') {
            setGenerationError(true);
            setIsGenerating(false);
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

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!wizardData.connectionId;
      case 2:
        return !!wizardData.projectId;
      case 3:
        return !!wizardData.templateId;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return 'Select Connection';
      case 2: return 'Choose Project';
      case 3: return 'Select Template';
      case 4: return 'Configure Report';
      case 5: return 'Generate Report';
      default: return '';
    }
  };

  const getButtonText = (): string => {
    if (currentStep < 4) return 'Next';
    if (currentStep === 4) return 'Generate Report';
    if (currentStep === 5) {
      if (isGenerating) return 'Generating...';
      if (generationComplete) return 'Download Report';
      if (generationError) return 'Retry';
      return 'Generate Report';
    }
    return 'Next';
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
            selectedProjectId={wizardData.projectId}
            onSelectProject={(projectId) => updateWizardData('projectId', projectId)}
            isLoading={isLoadingProjects}
          />
        );
      case 3:
        return (
          <TemplateSelection
            selectedTemplateId={wizardData.templateId}
            onSelectTemplate={(templateId) => updateWizardData('templateId', templateId)}
          />
        );
      case 4:
        return (
          <ReportConfiguration
            configuration={wizardData.configuration}
            onUpdateConfiguration={(config) => updateWizardData('configuration', config)}
          />
        );
      case 5:
        return (
          <ReportGeneration
            isGenerating={isGenerating}
            generationComplete={generationComplete}
            generationError={generationError}
          />
        );
      default:
        return null;
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep > step
                ? 'bg-green-500 text-white'
                : currentStep === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}
            >
              {currentStep > step ? <Check size={16} /> : step}
            </div>
            {step < 4 && (
              <div
                className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">{getStepTitle(currentStep)}</h2>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep <= 4 && renderProgressBar()}

        {connectionsLoading && (
          <div className="text-center py-8">
            <Loader className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading connections...</p>
          </div>
        )}

        {connectionsError && (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{connectionsError}</p>
            <p className="text-gray-600">Please check your connection to the platform integrations service.</p>
          </div>
        )}

        {!connectionsLoading && !connectionsError && renderStepContent()}

        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center px-6 py-2 rounded-lg ${currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <ArrowLeft size={16} className="mr-1" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!isStepComplete(currentStep) || (isGenerating && !generationComplete && !generationError)}
            className={`flex items-center px-6 py-2 rounded-lg ${!isStepComplete(currentStep) || (isGenerating && !generationComplete && !generationError)
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
            className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedConnectionId === connection.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getPlatformIcon(connection.platform)}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{connection.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{connection.platform}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Connected
                </span>
                {selectedConnectionId === connection.id && (
                  <Check size={20} className="text-blue-600" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ENHANCED Project Selection Component with Defensive Handling
const ProjectSelection: React.FC<{
  projects: any[],
  selectedProjectId: string,
  onSelectProject: (projectId: string) => void,
  isLoading: boolean
}> = ({ projects, selectedProjectId, onSelectProject, isLoading }) => {
  console.log('🎨 ProjectSelection rendering with:', {
    projectsCount: projects?.length || 0,
    isArray: Array.isArray(projects),
    projects: projects
  });

  // DEFENSIVE: Ensure projects is an array and filter out invalid items
  const safeProjects = React.useMemo(() => {
    if (!Array.isArray(projects)) {
      console.warn('⚠️  Projects prop is not an array:', typeof projects, projects);
      return [];
    }

    return projects.filter((project, index) => {
      const isValid = project &&
        typeof project === 'object' &&
        project.id &&
        project.name;

      if (!isValid) {
        console.warn(`⚠️  Invalid project at index ${index}:`, project);
      }

      return isValid;
    });
  }, [projects]);

  console.log('🔍 Safe projects:', safeProjects.length, safeProjects.map(p => ({ id: p.id, name: p.name })));

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading projects...</p>
      </div>
    );
  }

  if (safeProjects.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
        <p className="text-gray-600">
          No valid projects were found for the selected connection.
        </p>
        {/* Debug info */}
        {projects && projects.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            <p>Debug: Found {projects.length} raw projects, but {safeProjects.length} are valid.</p>
            <details className="mt-2 text-left">
              <summary className="cursor-pointer">Show raw data</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(projects, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Project</h2>
      <p className="text-gray-600 mb-6">Select which project to include in your report</p>

      {/* Debug info */}
      <div className="mb-4 text-sm text-gray-500">
        Found {safeProjects.length} valid projects
      </div>

      <div className="space-y-3">
        {safeProjects.map((project, index) => {
          // Additional safety check before rendering
          if (!project || !project.id || !project.name) {
            console.error(`❌ Invalid project in render loop at index ${index}:`, project);
            return null;
          }

          return (
            <div
              key={`${project.platform}-${project.id}-${index}`} // More unique key
              onClick={() => onSelectProject(project.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedProjectId === project.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {project.platform === 'jira' ? '🔄' :
                      project.platform === 'monday' ? '📊' : '📁'}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {project.platform} • ID: {project.id}
                    </p>
                    {project.description && project.description.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {project.description.substring(0, 100)}
                        {project.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    {project.status || 'Active'}
                  </span>
                  {selectedProjectId === project.id && (
                    <Check size={20} className="text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Template Selection Component - Enhanced with Better Feedback
const TemplateSelection: React.FC<{
  selectedTemplateId: string,
  onSelectTemplate: (templateId: string) => void
}> = ({ selectedTemplateId, onSelectTemplate }) => {
  console.log('🎨 TemplateSelection rendering with:', {
    selectedTemplateId,
    hasOnSelectTemplate: !!onSelectTemplate
  });

  const templates = [
    {
      id: 'standard',
      name: 'Standard Report',
      description: 'A comprehensive report with all project metrics and insights',
      preview: '📊'
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview for stakeholders and executives',
      preview: '📈'
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'In-depth analysis with charts, tables, and detailed breakdowns',
      preview: '📋'
    }
  ];

  // Enhanced click handler with debugging
  const handleTemplateClick = (templateId: string, templateName: string) => {
    console.log('🖱️ Template clicked:', { templateId, templateName });
    try {
      onSelectTemplate(templateId);
      console.log('✅ onSelectTemplate called successfully');
    } catch (err) {
      console.error('❌ Error in onSelectTemplate:', err);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Template</h2>
      <p className="text-gray-600 mb-6">Choose a report template that best fits your needs</p>

      <div className="mb-4 text-sm text-gray-500">
        {selectedTemplateId ? `Selected: ${templates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}` : 'No template selected'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          console.log(`🎨 Rendering template ${template.id}:`, { isSelected });

          return (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template.id, template.name)}
              className={`p-6 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isSelected
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{template.preview}</div>
                <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                {isSelected && (
                  <div className="flex items-center justify-center">
                    <Check size={20} className="text-blue-600 mr-2" />
                    <span className="text-sm text-blue-600 font-medium">Selected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Debug info */}
      <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p>Debug: Template selection step</p>
        <p>Selected template ID: {selectedTemplateId || 'none'}</p>
        <p>Available templates: {templates.length}</p>
      </div>
    </div>
  );
};

// Report Configuration Component
const ReportConfiguration: React.FC<{
  configuration: any,
  onUpdateConfiguration: (config: any) => void
}> = ({ configuration, onUpdateConfiguration }) => {
  const updateConfig = (key: string, value: any) => {
    onUpdateConfiguration({
      ...configuration,
      [key]: value
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Configure Report</h2>
      <p className="text-gray-600 mb-6">Customize your report settings</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={configuration.title || ''}
            onChange={(e) => updateConfig('title', e.target.value)}
            placeholder="Enter custom report title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Include Sections
          </label>
          <div className="space-y-3">
            {[
              { key: 'includeMetrics', label: 'Project Metrics', description: 'Include key performance indicators' },
              { key: 'includeTasks', label: 'Task Details', description: 'Include task status and assignments' },
              { key: 'includeTimeline', label: 'Project Timeline', description: 'Include project timeline and milestones' },
              { key: 'includeResources', label: 'Team Resources', description: 'Include team member information' }
            ].map((section) => (
              <div key={section.key} className="flex items-start">
                <input
                  type="checkbox"
                  checked={configuration[section.key] !== false}
                  onChange={(e) => updateConfig(section.key, e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    {section.label}
                  </label>
                  <p className="text-xs text-gray-500">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Generation Component
const ReportGeneration: React.FC<{
  isGenerating: boolean,
  generationComplete: boolean,
  generationError: boolean
}> = ({ isGenerating, generationComplete, generationError }) => {
  return (
    <div className="text-center py-8">
      {isGenerating && (
        <>
          <Loader className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Report</h3>
          <p className="text-gray-600">Please wait while we create your PowerPoint report...</p>
        </>
      )}

      {generationComplete && (
        <>
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Report Generated Successfully</h3>
          <p className="text-gray-600">Your report is ready for download.</p>
        </>
      )}

      {generationError && (
        <>
          <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Failed</h3>
          <p className="text-gray-600">There was an error generating your report. Please try again.</p>
        </>
      )}
    </div>
  );
};

export default ReportWizard;