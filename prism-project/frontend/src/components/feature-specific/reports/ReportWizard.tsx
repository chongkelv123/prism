// frontend/src/components/feature-specific/reports/ReportWizard.tsx (Updated)
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, CheckCircle, Clock, X } from 'lucide-react';
import reportService from '../../../services/report.service';
import { useNotifications } from '../../../contexts/NotificationContext';
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

  const { addNotification } = useNotifications();
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

// Connection Selection Component (NEW)
const ConnectionSelection: React.FC<{
  connections: any[],
  selectedConnectionId: string,
  onSelectConnection: (connectionId: string) => void
}> = ({ connections, selectedConnectionId, onSelectConnection }) => {
  if (connections.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Platforms</h3>