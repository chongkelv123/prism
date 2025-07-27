export interface FilenameOptions {
  platform: string;
  templateType: 'standard' | 'executive' | 'detailed';
  projectName: string;
  projectId?: string;
  reportTitle?: string;
  timestamp?: Date;
  includeProjectId?: boolean;
}

export class FilenameGenerator {
  
  /**
   * Generate a standardized filename for reports
   * Format: Platform_TemplateType_ProjectName_YYYY-MM-DD.pptx
   * Example: Jira_Detailed_Analysis_PRISM-Development-Project_2025-07-27.pptx
   */
  static generateReportFilename(options: FilenameOptions): string {
    const {
      platform,
      templateType,
      projectName,
      projectId,
      reportTitle,
      timestamp = new Date(),
      includeProjectId = false
    } = options;

    // 1. Platform (capitalize first letter)
    const platformPart = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();

    // 2. Template type with proper naming
    const templatePart = this.formatTemplateName(templateType);

    // 3. Project name (sanitized for filename)
    const projectPart = this.sanitizeForFilename(projectName);

    // 4. Optional project ID
    const projectIdPart = includeProjectId && projectId 
      ? `_${this.sanitizeForFilename(projectId)}`
      : '';

    // 5. Date in YYYY-MM-DD format
    const datePart = timestamp.toISOString().slice(0, 10);

    // Construct filename
    const filename = `${platformPart}_${templatePart}_${projectPart}${projectIdPart}_${datePart}.pptx`;

    return filename;
  }

  /**
   * Generate a storage filename (internal use with timestamp for uniqueness)
   * Format: platform-template-projectname-timestamp.pptx
   * Example: jira-detailed-prism-development-project-1753603603659.pptx
   */
  static generateStorageFilename(options: FilenameOptions): string {
    const {
      platform,
      templateType,
      projectName,
      timestamp = new Date()
    } = options;

    const platformPart = platform.toLowerCase();
    const templatePart = templateType.toLowerCase();
    const projectPart = this.sanitizeForFilename(projectName, '-');
    const timestampPart = timestamp.getTime();

    return `${platformPart}-${templatePart}-${projectPart}-${timestampPart}.pptx`;
  }

  /**
   * Generate download filename (user-friendly)
   * Format: ReportTitle_ProjectName_YYYY-MM-DD.pptx
   * Example: Jira_Detailed_Analysis_PRISM-Development-Project_2025-07-27.pptx
   */
  static generateDownloadFilename(options: FilenameOptions): string {
    const {
      reportTitle,
      projectName,
      platform,
      templateType,
      timestamp = new Date()
    } = options;

    // Use report title if available, otherwise construct from platform + template
    const titlePart = reportTitle 
      ? this.sanitizeForFilename(reportTitle)
      : `${platform.charAt(0).toUpperCase() + platform.slice(1)}_${this.formatTemplateName(templateType)}`;

    const projectPart = this.sanitizeForFilename(projectName);
    const datePart = timestamp.toISOString().slice(0, 10);

    return `${titlePart}_${projectPart}_${datePart}.pptx`;
  }

  /**
   * Format template name for display
   */
  private static formatTemplateName(templateType: string): string {
    switch (templateType.toLowerCase()) {
      case 'standard':
        return 'Standard_Report';
      case 'executive':
        return 'Executive_Summary';
      case 'detailed':
        return 'Detailed_Analysis';
      default:
        return templateType.charAt(0).toUpperCase() + templateType.slice(1) + '_Report';
    }
  }

  /**
   * Sanitize string for use in filenames
   */
  private static sanitizeForFilename(input: string, separator: string = '-'): string {
    return input
      .trim()
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .replace(/\s+/g, separator)         // Replace spaces with separator
      .replace(/[_-]+/g, separator)       // Replace multiple separators with single
      .replace(/^[_-]+|[_-]+$/g, '')      // Remove leading/trailing separators
      || 'Unknown';
  }

  /**
   * Extract project identifier from project name for shorter filenames
   */
  static extractProjectIdentifier(projectName: string): string {
    // Extract meaningful project identifier
    const words = projectName.split(/[\s\-_]+/);
    
    if (words.length === 1) {
      return words[0];
    }

    // Take first word and any capitalized words
    const identifier = words
      .filter((word, index) => index === 0 || /^[A-Z]/.test(word))
      .join('-');

    return identifier || projectName.substring(0, 20);
  }
}