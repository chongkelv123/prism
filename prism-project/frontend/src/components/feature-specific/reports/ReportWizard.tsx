import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, CheckCircle, Clock, X } from 'lucide-react';
import reportService from '../../../services/report.service';
import { useNotifications } from '../../../contexts/NotificationContext';

const ReportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    platform: '',
    template: '',
    configuration: {}
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const { addNotification } = useNotifications();

  const totalSteps = 4;

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
      // Final step - check state
      if (generationComplete) {
        // If generation is complete, download the report
        handleDownload();
      } else if (generationError) {
        // If there was an error, try again
        setGenerationError(false);
        setIsGenerating(false);
        handleGenerateReport();
      } else {
        // Otherwise, start the generation
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
      // Call API to generate report
      const report = await reportService.generateReport({
        platformId: wizardData.platform,
        templateId: wizardData.template,
        configuration: wizardData.configuration
      });

      setReportId(report.id);

      // Poll for report generation status
      const checkStatus = async () => {
        try {
          const status = await reportService.getReportStatus(report.id);

          if (status.status === 'completed') {
            setGenerationComplete(true);
            setIsGenerating(false);
            // Add notification
            addNotification({
              type: 'success',
              title: 'Report Generated',
              message: `Your "${report.title}" report is ready to download`,
              actions: [
                { label: 'Download', action: 'download', id: report.id },
                { label: 'View', action: 'view', id: report.id }
              ]
            });
          } else if (status.status === 'failed') {
            setGenerationError(true);
            setIsGenerating(false);
            // Add notification
            addNotification({
              type: 'error',
              title: 'Report Generation Failed',
              message: 'There was an error generating your report',
              actions: [
                { label: 'Try Again', action: 'retry', id: report.id }
              ]
            });
          } else {
            // Still processing, check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Failed to check report status', error);
          setGenerationError(true);
          setIsGenerating(false);
        }
      };

      // Start polling
      checkStatus();

    } catch (error) {
      console.error('Failed to generate report', error);
      setGenerationError(true);
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (reportId) {
      // Prepare report data based on the wizard input
      const reportData = {
        title: wizardData.configuration.title || 'Project Report',
        platform: wizardData.platform,
        date: new Date().toLocaleDateString(),
        metrics: [
          { name: 'Tasks Completed', value: '32' },
          { name: 'In Progress', value: '12' },
          { name: 'Blockers', value: '3' }
        ],
        team: [
          { name: 'Professor Ganesh', role: 'Project Manager' },
          { name: 'Kelvin Chong', role: 'Developer' },
          { name: 'Chan Jian Da', role: 'DevOps' },
          { name: 'Bryan', role: 'Designer' }
        ]
      };

      // Pass the custom data to the download function
      reportService.downloadReport(reportId, reportData);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PlatformSelection
            selectedPlatform={wizardData.platform}
            onSelectPlatform={(platform) => updateWizardData('platform', platform)}
          />
        );
      case 2:
        return (
          <TemplateSelection
            selectedTemplate={wizardData.template}
            onSelectTemplate={(template) => updateWizardData('template', template)}
          />
        );
      case 3:
        return (
          <ReportConfiguration
            configuration={wizardData.configuration}
            onUpdateConfiguration={(config) => updateWizardData('configuration', config)}
            platform={wizardData.platform}
          />
        );
      case 4:
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
        return !!wizardData.platform;
      case 2:
        return !!wizardData.template;
      case 3:
        return Object.keys(wizardData.configuration).length > 0;
      case 4:
        return !isGenerating || generationComplete || generationError;
      default:
        return false;
    }
  };

  const getButtonText = () => {
    if (currentStep === totalSteps) {
      if (!isGenerating && !generationComplete && !generationError) {
        return 'Generate Report';
      } else if (generationComplete) {
        return 'Download Report';
      } else if (generationError) {
        return 'Try Again';
      }
      return 'Generating...';
    }
    return 'Continue';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">
      {/* Wizard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Report</h1>
        <p className="text-gray-600">Follow the steps to generate your PowerPoint report</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isDone = isStepComplete(stepNum);

            return (
              <div key={idx} className="flex flex-col items-center relative">
                {/* Connector line */}
                {idx < totalSteps - 1 && (
                  <div
                    className={`absolute w-full h-1 top-4 left-1/2 -z-10 ${isDone ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                  />
                )}
                {/* Step circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${isActive || isDone ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {isDone ? <Check size={16} /> : stepNum}
                </div>
                {/* Step label */}
                <span className={`text-sm mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {stepNum === 1 && 'Platform'}
                  {stepNum === 2 && 'Template'}
                  {stepNum === 3 && 'Configure'}
                  {stepNum === 4 && 'Generate'}
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
          {currentStep !== totalSteps && <ArrowRight size={16} className="ml-1" />}
          {currentStep === totalSteps && generationComplete && <Check size={16} className="ml-1" />}
        </button>
      </div>
    </div>
  );
};

// Platform Selection Component
const PlatformSelection: React.FC<{
  selectedPlatform: string,
  onSelectPlatform: (platform: string) => void
}> = ({ selectedPlatform, onSelectPlatform }) => {
  const platforms = [
    { id: 'monday', name: 'Monday.com', icon: '📊' },
    { id: 'jira', name: 'Jira', icon: '🔄' },
    { id: 'trofos', name: 'TROFOS', icon: '📈' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Select Project Management Platform</h2>
      <p className="text-gray-500 mb-4">Choose the platform you want to generate a report from</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map(platform => (
          <div
            key={platform.id}
            onClick={() => onSelectPlatform(platform.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all
              ${selectedPlatform === platform.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300'}`}
          >
            <div className="flex flex-col items-center text-center p-4">
              <div className="text-3xl mb-2">{platform.icon}</div>
              <h3 className="font-medium">{platform.name}</h3>
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
    { id: 'project-overview', name: 'Project Overview', thumbnail: '🖼️' },
    { id: 'sprint-review', name: 'Sprint Review', thumbnail: '🖼️' },
    { id: 'status-report', name: 'Status Report', thumbnail: '🖼️' },
    { id: 'roadmap', name: 'Project Roadmap', thumbnail: '🖼️' },
    { id: 'resource-allocation', name: 'Resource Allocation', thumbnail: '🖼️' },
    { id: 'custom-1', name: 'Custom Template 1', thumbnail: '🖼️' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Select Template</h2>
      <p className="text-gray-500 mb-4">Choose a presentation template for your report</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`border rounded-lg cursor-pointer overflow-hidden transition-all
              ${selectedTemplate === template.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300'}`}
          >
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <span className="text-4xl">{template.thumbnail}</span>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-center">{template.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Report Configuration Component
const ReportConfiguration: React.FC<{
  configuration: Record<string, any>,
  onUpdateConfiguration: (config: Record<string, any>) => void,
  platform: string
}> = ({ configuration, onUpdateConfiguration, platform }) => {
  // Sample configuration with default values
  const defaultConfig = {
    title: 'Project Status Report',
    includeMetrics: true,
    includeTasks: true,
    includeTimeline: true,
    includeResources: false,
    dateRange: 'last30Days'
  };

  const [config, setConfig] = useState({ ...defaultConfig, ...configuration });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : value;

    setConfig({
      ...config,
      [name]: newValue
    });
  };

  const handleSave = () => {
    onUpdateConfiguration(config);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Configure Report</h2>
      <p className="text-gray-500 mb-4">Customize the content of your report</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Title
          </label>
          <input
            type="text"
            name="title"
            value={config.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <select
            name="dateRange"
            value={config.dateRange}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="last7Days">Last 7 Days</option>
            <option value="last14Days">Last 14 Days</option>
            <option value="last30Days">Last 30 Days</option>
            <option value="currentSprint">Current Sprint</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="block text-sm font-medium text-gray-700">
            Include in Report
          </p>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeMetrics"
                checked={config.includeMetrics}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Project Metrics</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeTasks"
                checked={config.includeTasks}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Tasks & Issues</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeTimeline"
                checked={config.includeTimeline}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Project Timeline</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="includeResources"
                checked={config.includeResources}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Resource Allocation</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 text-right">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Configuration
        </button>
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
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {isGenerating && (
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-medium mb-2">Generating Your Report</h2>
          <p className="text-gray-500">This may take a few moments</p>
        </div>
      )}

      {isComplete && (
        <div className="text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-green-100 text-green-500 rounded-full mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-medium mb-2">Report Generated Successfully!</h2>
          <p className="text-gray-500 mb-4">Your PowerPoint report is ready to download</p>
          <button
            onClick={onDownload}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
          >
            <FileText size={18} className="mr-2" />
            Download Report
          </button>
        </div>
      )}

      {hasError && (
        <div className="text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-red-100 text-red-500 rounded-full mx-auto mb-4">
            <X size={32} />
          </div>
          <h2 className="text-xl font-medium mb-2">Generation Failed</h2>
          <p className="text-gray-500 mb-4">There was an error generating your report</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportWizard;