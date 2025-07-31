// frontend/src/components/feature-specific/reports/ReportWizard.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, CheckCircle, Clock, X, AlertCircle, Loader } from 'lucide-react';
import reportService, { ReportGenerationRequest } from '../../../services/report.service';
import { useConnections } from '../../../contexts/ConnectionsContext';

const SHOW_DEBUG_PANEL = true; // Set to true to enable debug panel

// FIXED: Add proper TypeScript interfaces
interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error' | 'active'; // FIXED: Added 'active' status
  projectCount: number;
  lastSync?: string;
  lastSyncError?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  platform: string;
  description?: string;
  status?: string;
  metrics?: any[];
  team?: any[];
  tasks?: any[];
  lastUpdated?: string;
}

interface WizardData {
  connectionId: string;
  projectId: string;
  templateId: string;
  configuration: {
    title?: string;
    includeMetrics?: boolean;
    includeTasks?: boolean;
    includeTimeline?: boolean;
    includeResources?: boolean;
    [key: string]: any;
  };
}

const ReportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    connectionId: '',
    projectId: '',
    templateId: '',
    configuration: {
      includeMetrics: true,
      includeTasks: true,
      includeTimeline: true,
      includeResources: true
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const {
    connections,
    getProjectData,
    isLoading: connectionsLoading,
    error: connectionsError,
    isServiceAvailable
  } = useConnections();

  const totalSteps = 4;

  // ENHANCED DEBUGGING: Add comprehensive logging
  useEffect(() => {
    console.log('🔍 ReportWizard Debug Info:');
    console.log('  - Total connections:', connections.length);
    console.log('  - Connections loading:', connectionsLoading);
    console.log('  - Connections error:', connectionsError);
    console.log('  - Service available:', isServiceAvailable);
    console.log('  - Raw connections:', connections);

    if (connections.length > 0) {
      console.log('  - Connection statuses:', connections.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        platform: c.platform
      })));
    }

    // FIXED: Enhanced status filtering to accept multiple valid statuses
    const validStatuses = ['connected', 'active', 'success'];
    const connectedCount = connections.filter(conn =>
      validStatuses.includes(conn.status?.toLowerCase())
    ).length;

    console.log('  - Connected platforms:', connectedCount);

    // Check if there's a status mismatch
    if (connections.length > 0 && connectedCount === 0) {
      console.warn('⚠️ STATUS MISMATCH: Connections exist but none have valid status');
      console.warn('   Connection statuses:', connections.map(c => `${c.name}: "${c.status}"`));
      console.warn('   Expected statuses:', validStatuses);
    }
  }, [connections, connectionsLoading, connectionsError, isServiceAvailable]);

  // FIXED: Enhanced connection filtering with multiple valid statuses
  const connectedPlatforms = React.useMemo(() => {
    const validStatuses = ['connected', 'active', 'success'];

    return connections.filter(conn => {
      const isConnected = validStatuses.includes(conn.status?.toLowerCase());

      if (!isConnected) {
        console.log(`Filtering out connection "${conn.name}" - status: "${conn.status}" (expected one of: ${validStatuses.join(', ')})`);
      } else {
        console.log(`Including connection "${conn.name}" - status: "${conn.status}"`);
      }

      return isConnected;
    });
  }, [connections]);

  // DEBUGGING: Log the filtered result
  useEffect(() => {
    console.log('🎯 ReportWizard connectedPlatforms result:', connectedPlatforms.length);
    if (connectedPlatforms.length === 0 && connections.length > 0) {
      console.warn('⚠️ No connected platforms found but connections exist!');
      console.warn('   This indicates a status field issue.');
      console.warn('   Check connection status values:', connections.map(c => c.status));
    }
  }, [connectedPlatforms, connections]);

  // FIXED: Enhanced project loading trigger
  useEffect(() => {
    console.log('🎯 Project loading trigger check:', {
      connectionId: wizardData.connectionId,
      currentStep,
      isLoadingProjects,
      hasGetProjectData: typeof getProjectData === 'function',
      serviceAvailable: isServiceAvailable
    });

    if (wizardData.connectionId &&
      currentStep === 2 &&
      !isLoadingProjects &&
      typeof getProjectData === 'function' &&
      isServiceAvailable) {
      console.log('🚀 Triggering project load for connection:', wizardData.connectionId);
      loadProjectsForConnection();
    }
  }, [wizardData.connectionId, currentStep, isServiceAvailable]);

  // ENHANCED PROJECT LOADING WITH DEFENSIVE HANDLING
  const loadProjectsForConnection = async () => {
    if (!wizardData.connectionId) {
      console.warn('❌ No connection ID provided for project loading');
      return;
    }

    console.log('🔄 Starting project load for connection:', wizardData.connectionId);
    setIsLoadingProjects(true);
    setAvailableProjects([]); // Clear previous projects

    try {
      console.log('📡 Calling getProjectData API...');
      const projectData = await getProjectData(wizardData.connectionId);

      console.log('📊 Raw API response:', {
        type: typeof projectData,
        isArray: Array.isArray(projectData),
        length: Array.isArray(projectData) ? projectData.length : 'N/A',
        data: projectData
      });

      // DEFENSIVE: Handle different response formats
      let projects: any[] = [];

      if (Array.isArray(projectData)) {
        projects = projectData;
      } else if (projectData && Array.isArray(projectData.projects)) {
        projects = projectData.projects;
      } else if (projectData && typeof projectData === 'object') {
        // Single project returned
        projects = [projectData];
      } else {
        console.error('❌ Unexpected project data format:', projectData);
        projects = [];
      }

      // ENHANCED: Validate and transform project data
      const validProjects: Project[] = projects
        .filter((project, index) => {
          const isValid = project &&
            typeof project === 'object' &&
            (project.id || project.key || project.board_id) &&
            (project.name || project.displayName || project.title);

          if (!isValid) {
            console.warn(`⚠️ Invalid project at index ${index}:`, project);
          }
          return isValid;
        })
        .map((project, index): Project => {
          // Normalize project data for consistent frontend usage
          const normalizedProject: Project = {
            id: project.id || project.key || project.board_id || `project-${index}`,
            name: project.name || project.displayName || project.title || `Unnamed Project ${index + 1}`,
            platform: project.platform || 'unknown',
            description: project.description || project.summary || '',
            status: project.status || 'active',
            metrics: Array.isArray(project.metrics) ? project.metrics : [],
            team: Array.isArray(project.team) ? project.team : [],
            tasks: Array.isArray(project.tasks) ? project.tasks : [],
            lastUpdated: project.lastUpdated || project.updated || new Date().toISOString()
          };

          console.log(`✅ Normalized project ${index + 1}:`, {
            id: normalizedProject.id,
            name: normalizedProject.name,
            platform: normalizedProject.platform
          });

          return normalizedProject;
        });

      console.log(`🎉 Successfully loaded ${validProjects.length} valid projects`);
      console.log('Project names:', validProjects.map(p => p.name));

      setAvailableProjects(validProjects);

    } catch (error: any) {
      console.error('❌ Project loading failed:', {
        connectionId: wizardData.connectionId,
        error: error.message,
        stack: error.stack
      });

      setAvailableProjects([]);

    } finally {
      setIsLoadingProjects(false);
    }
  };

  const updateWizardData = (key: keyof WizardData, value: any) => {
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

  // FIXED: Corrected API interface to match reportService
  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      // Get selected connection and project data
      const selectedConnection = connectedPlatforms.find(c => c.id === wizardData.connectionId);
      const selectedProject = availableProjects.find(p => p.id === wizardData.projectId);

      if (!selectedConnection || !selectedProject) {
        throw new Error('Invalid connection or project selection');
      }

      // Create report title based on connection and project
      const reportTitle = wizardData.configuration.title ||
        `${selectedProject.name} - ${selectedConnection.name} Report`;

      // FIXED: Correct the API call to match reportService interface
      const reportRequest: ReportGenerationRequest = {
        platformId: selectedConnection.platform, // FIXED: Use platformId instead of platform
        templateId: wizardData.templateId,
        configuration: {
          ...wizardData.configuration,
          title: reportTitle,
          connectionId: wizardData.connectionId, // Include connection ID in configuration
          projectId: wizardData.projectId,       // Include project ID in configuration
          connectionName: selectedConnection.name,
          projectName: selectedProject.name
        }
      };

      console.log('🎨 Generating report with request:', reportRequest);

      const report = await reportService.generateReport(reportRequest);

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

    } catch (error: any) {
      console.error('Failed to generate report', error);
      setGenerationError(true);
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (reportId) {
      // Get real project data for the report
      const selectedProject = availableProjects.find(p => p.id === wizardData.projectId);
      const selectedConnection = connectedPlatforms.find(c => c.id === wizardData.connectionId);

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
      case 5:
        return generationComplete || !!reportId; // ← FIXED: Handle step 5
      default:
        return false;
    }
  };

  const isButtonDisabled = (): boolean => {
    if (currentStep === 5) {
      // For step 5: button is enabled when generation is complete OR when there's an error (for retry)
      return isGenerating && !generationComplete && !generationError;
    } else {
      // For other steps: use the original logic
      return !isStepComplete(currentStep);
    }
  };

  const getButtonClassName = (): string => {
    const baseClasses = "flex items-center px-6 py-2 rounded-lg";

    if (isButtonDisabled()) {
      return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }

    // Special styling for download button (step 5 when complete)
    if (currentStep === 5 && generationComplete) {
      return `${baseClasses} bg-green-600 text-white hover:bg-green-700`;
    }

    // Default active button styling
    return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
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
            isLoading={connectionsLoading}
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

  // ENHANCED: Add debug panel for troubleshooting
  const renderDebugPanel = () => (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-sm font-bold text-yellow-800 mb-2">🐛 DEBUG PANEL</h3>
      <div className="text-xs text-yellow-700 space-y-1">
        <p>Current Step: {currentStep}</p>
        <p>Step Complete: {isStepComplete(currentStep) ? 'Yes' : 'No'}</p>
        <p>Button Disabled: {isButtonDisabled() ? 'Yes' : 'No'}</p>
        <p>Is Generating: {isGenerating ? 'Yes' : 'No'}</p>
        <p>Generation Complete: {generationComplete ? 'Yes' : 'No'}</p>
        <p>Generation Error: {generationError ? 'Yes' : 'No'}</p>
        <p>Report ID: {reportId || 'None'}</p>
        <p>Button Text: {getButtonText()}</p>
        <p>Connection ID: {wizardData.connectionId || 'None'}</p>
        <p>Project ID: {wizardData.projectId || 'None'}</p>
        <p>Template ID: {wizardData.templateId || 'None'}</p>
        <p>Total Connections: {connections.length}</p>
        <p>Connected Platforms: {connectedPlatforms.length}</p>
        <p>Available Projects: {availableProjects.length}</p>
        <p>Loading Projects: {isLoadingProjects ? 'Yes' : 'No'}</p>
        <p>Service Available: {isServiceAvailable ? 'Yes' : 'No'}</p>
        {connections.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Connection Details</summary>
            <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(connections.map(c => ({ id: c.id, name: c.name, status: c.status })), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Debug panel - remove in production */}
      {SHOW_DEBUG_PANEL && renderDebugPanel()}

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
            disabled={isButtonDisabled()}
            className={getButtonClassName()}
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

// FIXED: Enhanced Connection Selection Component with proper types
const ConnectionSelection: React.FC<{
  connections: Connection[];
  selectedConnectionId: string;
  onSelectConnection: (connectionId: string) => void;
  isLoading: boolean;
}> = ({ connections, selectedConnectionId, onSelectConnection, isLoading }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'monday': return '📊';
      case 'jira': return '🔄';
      case 'trofos': return '📈';
      default: return '🔗';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading connections...</p>
      </div>
    );
  }

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
                  <p className="text-sm text-gray-500 capitalize">
                    {connection.platform} • {connection.projectCount || 0} projects
                  </p>
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

// ENHANCED Project Selection Component with proper types and defensive handling
const ProjectSelection: React.FC<{
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  isLoading: boolean;
}> = ({ projects, selectedProjectId, onSelectProject, isLoading }) => {
  console.log('🎨 ProjectSelection rendering with:', {
    projectsCount: projects?.length || 0,
    isArray: Array.isArray(projects),
    selectedId: selectedProjectId,
    isLoading
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading projects...</p>
        <p className="text-xs text-gray-400 mt-2">
          Fetching project data from API...
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
        <p className="text-gray-600 mb-4">
          No projects were found for the selected connection. This could mean:
        </p>
        <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
          <li>• The connection has no projects configured</li>
          <li>• There was an error loading project data</li>
          <li>• The platform integration needs to be refreshed</li>
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Project</h2>
      <p className="text-gray-600 mb-6">Select which project to include in your report</p>

      <div className="mb-4 text-sm text-gray-500">
        Found {projects.length} projects
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
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
        ))}
      </div>
    </div>
  );
};

// Template Selection Component
const TemplateSelection: React.FC<{
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}> = ({ selectedTemplateId, onSelectTemplate }) => {
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Template</h2>
      <p className="text-gray-600 mb-6">Choose a report template that best fits your needs</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${selectedTemplateId === template.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{template.preview}</div>
              <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{template.description}</p>
              {selectedTemplateId === template.id && (
                <Check size={20} className="text-blue-600 mx-auto" />
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
  configuration: WizardData['configuration'];
  onUpdateConfiguration: (config: WizardData['configuration']) => void;
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
  isGenerating: boolean;
  generationComplete: boolean;
  generationError: boolean;
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