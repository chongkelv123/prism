// backend/services/report-generation-service/src/generators/ExecutiveSummaryGenerator.ts
// Enhanced Executive Summary Template (5-7 slides) - Windows Compatible (No Unicode/Symbols)
// ENHANCED: Uses real platform data with executive-level insights

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { DataAnalyticsService, AnalyticsMetrics } from '../services/DataAnalyticsService';

export interface ExecutiveReportConfig {
  title?: string;
  includeMetrics?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  includeResources?: boolean;
  [key: string]: any;
}

interface ExecutiveKPI {
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  impact: 'high' | 'medium' | 'low';
  color: string;
}

export class ExecutiveSummaryGenerator {
  private readonly STORAGE_DIR: string;
  private analytics: AnalyticsMetrics;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Get platform theme colors for executive presentation
   */
  private getPlatformTheme(platform: string): { primary: string; secondary: string; accent: string; gradient: string } {
    switch (platform.toLowerCase()) {
      case 'jira':
        return { primary: '2684FF', secondary: '0052CC', accent: 'E3F2FD', gradient: 'linear-gradient(135deg, #2684FF 0%, #0052CC 100%)' };
      case 'monday':
      case 'monday.com':
        return { primary: 'FF3366', secondary: 'D91A46', accent: 'FFEBEE', gradient: 'linear-gradient(135deg, #FF3366 0%, #D91A46 100%)' };
      case 'trofos':
        return { primary: '6366F1', secondary: '4F46E5', accent: 'EEF2FF', gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' };
      default:
        return { primary: '374151', secondary: '1F2937', accent: 'F9FAFB', gradient: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)' };
    }
  }

  /**
   * Calculate executive-level KPIs from real platform data
   */
  private calculateExecutiveKPIs(projectData: ProjectData): ExecutiveKPI[] {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    const completedTasks = tasks.filter(task => 
      ['done', 'completed', 'closed', 'resolved'].includes(task.status.toLowerCase())
    ).length;

    return [
      {
        name: 'Project Health',
        value: this.getProjectHealthScore(),
        trend: this.analytics.velocityTrend === 'increasing' ? 'up' : this.analytics.velocityTrend === 'decreasing' ? 'down' : 'stable',
        impact: 'high',
        color: this.getProjectHealthScore() >= '85%' ? '10B981' : this.getProjectHealthScore() >= '70%' ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Delivery Progress',
        value: `${this.analytics.completionRate}%`,
        trend: this.analytics.velocityTrend === 'increasing' ? 'up' : this.analytics.velocityTrend === 'decreasing' ? 'down' : 'stable',
        impact: 'high',
        color: this.analytics.completionRate >= 80 ? '10B981' : this.analytics.completionRate >= 60 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Team Productivity',
        value: `${this.analytics.teamEfficiency}%`,
        trend: 'stable',
        impact: 'medium',
        color: this.analytics.teamEfficiency >= 75 ? '10B981' : this.analytics.teamEfficiency >= 60 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Quality Index',
        value: `${this.analytics.qualityScore}%`,
        trend: 'up',
        impact: 'medium',
        color: this.analytics.qualityScore >= 85 ? '10B981' : this.analytics.qualityScore >= 70 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Risk Exposure',
        value: this.analytics.riskLevel.toUpperCase(),
        trend: this.analytics.blockedItemsCount > 3 ? 'up' : 'down',
        impact: 'high',
        color: this.analytics.riskLevel === 'low' ? '10B981' : this.analytics.riskLevel === 'medium' ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Resource Utilization',
        value: `${this.calculateResourceUtilization(projectData)}%`,
        trend: 'stable',
        impact: 'medium',
        color: this.calculateResourceUtilization(projectData) >= 80 ? '10B981' : this.calculateResourceUtilization(projectData) >= 65 ? 'F59E0B' : 'EF4444'
      }
    ];
  }

  /**
   * Generate Executive Summary PowerPoint (5-7 slides)
   */
  async generate(
    projectData: ProjectData, 
    config: ExecutiveReportConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Enhanced Executive Summary', {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: projectData.tasks?.length || 0,
        teamSize: projectData.team?.length || 0,
        usingFallback: projectData.fallbackData || false
      });

      // Calculate enhanced analytics
      this.analytics = DataAnalyticsService.calculateAnalytics(projectData);

      // Initialize PowerPoint
      const pptx = new PptxGenJS();
      
      // Configure presentation
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Executive Analytics';
      pptx.company = 'Executive Intelligence';
      pptx.subject = `Executive Summary - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - Executive Summary`;

      const theme = this.getPlatformTheme(projectData.platform);

      // Generate slides
      await this.createExecutiveTitleSlide(pptx, projectData, config, theme);
      await progressCallback?.(15);

      await this.createProjectHealthDashboard(pptx, projectData, theme);
      await progressCallback?.(30);

      await this.createStrategicProgressSlide(pptx, projectData, theme);
      await progressCallback?.(50);

      await this.createResourceOverviewSlide(pptx, projectData, theme);
      await progressCallback?.(70);

      await this.createRiskSummarySlide(pptx, projectData, theme);
      await progressCallback?.(85);

      await this.createKeyDecisionsSlide(pptx, projectData, theme);
      await progressCallback?.(95);

      // Save file
      const filename = `executive-summary-${projectData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pptx`;
      const filepath = path.join(this.STORAGE_DIR, filename);
      
      await pptx.writeFile({ fileName: filepath });
      await progressCallback?.(100);

      logger.info('Executive Summary generated successfully', {
        filename,        
        platform: projectData.platform
      });

      return filename;

    } catch (error) {
      logger.error('Error generating Executive Summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Executive Summary: ${errorMessage}`);
    }
  }

  /**
   * Create executive title slide with impact-focused messaging
   */
  private async createExecutiveTitleSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData, 
    config: ExecutiveReportConfig,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    // Premium background
    slide.background = { color: theme.accent };

    // Executive title with impact statement
    const healthScore = this.getProjectHealthScore();
    const impactTitle = `${projectData.name} Executive Summary`;
    const impactSubtitle = `${healthScore} Project Health | ${this.analytics.completionRate}% Complete | ${this.getExecutiveStatusMessage()}`;

    slide.addText(impactTitle, {
      x: '5%',
      y: '20%',
      w: '90%',
      h: '15%',
      fontSize: 36,
      color: theme.primary,
      bold: true,
      align: 'center'
    });

    slide.addText(impactSubtitle, {
      x: '5%',
      y: '37%',
      w: '90%',
      h: '10%',
      fontSize: 18,
      color: theme.secondary,
      align: 'center'
    });

    // Key executive metrics banner
    const executiveKPIs = this.calculateExecutiveKPIs(projectData);
    const topKPIs = executiveKPIs.slice(0, 3);
    
    topKPIs.forEach((kpi, index) => {
      const x = 1 + (index * 3.2);
      
      // KPI value
      slide.addText(kpi.value, {
        x,
        y: 4,
        w: 3,
        h: 0.8,
        fontSize: 24,
        color: kpi.color,
        bold: true,
        align: 'center'
      });
      
      // KPI name
      slide.addText(kpi.name, {
        x,
        y: 4.8,
        w: 3,
        h: 0.5,
        fontSize: 12,
        color: '374151',
        align: 'center'
      });
    });

    // Data source and generation info
    const dataInfo = projectData.fallbackData ? 
      'DEMONSTRATION DATA - For planning and process validation' : 
      `LIVE ${projectData.platform.toUpperCase()} DATA - Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    slide.addText(dataInfo, {
      x: '10%',
      y: '85%',
      w: '80%',
      h: '8%',
      fontSize: 10,
      color: '6B7280',
      align: 'center'
    });
  }

  /**
   * Create project health dashboard with executive KPIs
   */
  private async createProjectHealthDashboard(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('PROJECT HEALTH DASHBOARD', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      color: theme.primary,
      bold: true
    });

    // Executive KPIs grid
    const executiveKPIs = this.calculateExecutiveKPIs(projectData);
    
    executiveKPIs.forEach((kpi, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 0.5 + (col * 3.2);
      const y = 1.5 + (row * 2);

      // KPI card background
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: 3,
        h: 1.8,
        fill: { color: 'FFFFFF' },
        line: { color: 'E5E7EB', width: 1 }
      });

      // KPI value
      slide.addText(kpi.value, {
        x: x + 0.1,
        y: y + 0.2,
        w: 2.8,
        h: 0.6,
        fontSize: 20,
        color: kpi.color,
        bold: true,
        align: 'center'
      });

      // KPI name
      slide.addText(kpi.name, {
        x: x + 0.1,
        y: y + 0.8,
        w: 2.8,
        h: 0.4,
        fontSize: 12,
        color: '374151',
        align: 'center'
      });

      // Trend indicator
      const trendSymbol = kpi.trend === 'up' ? '↗' : kpi.trend === 'down' ? '↘' : '→';
      const trendColor = kpi.trend === 'up' ? '10B981' : kpi.trend === 'down' ? 'EF4444' : '6B7280';
      
      slide.addText(`${trendSymbol} ${kpi.impact.toUpperCase()} IMPACT`, {
        x: x + 0.1,
        y: y + 1.2,
        w: 2.8,
        h: 0.4,
        fontSize: 9,
        color: trendColor,
        align: 'center'
      });
    });

    // Executive summary text
    const executiveSummary = this.generateExecutiveSummary(projectData);
    slide.addText('EXECUTIVE SUMMARY', {
      x: 0.5,
      y: 5.5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(executiveSummary, {
      x: 0.5,
      y: 6,
      w: '90%',
      h: 1.5,
      fontSize: 12,
      color: '374151'
    });
  }

  /**
   * Create strategic progress slide with real milestone data
   */
  private async createStrategicProgressSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('STRATEGIC PROGRESS & MILESTONES', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      color: theme.primary,
      bold: true
    });

    // Progress visualization
    const completionRate = this.analytics.completionRate;
    slide.addText(`${completionRate}% COMPLETE`, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 1,
      fontSize: 48,
      color: completionRate >= 80 ? '10B981' : completionRate >= 60 ? 'F59E0B' : 'EF4444',
      bold: true,
      align: 'center'
    });

    // Strategic milestones from real data
    const milestones = this.extractStrategicMilestones(projectData);
    if (milestones.length > 0) {
      slide.addText('KEY MILESTONES', {
        x: 0.5,
        y: 3,
        w: 4.5,
        h: 0.5,
        fontSize: 16,
        color: '374151',
        bold: true
      });

      const milestoneText = milestones.map(milestone => 
        `${milestone.status === 'completed' ? '✓' : milestone.status === 'inprogress' ? '○' : '◯'} ${milestone.name} (${milestone.target})`
      ).join('\n');

      slide.addText(milestoneText, {
        x: 0.5,
        y: 3.5,
        w: 4.5,
        h: 3,
        fontSize: 11,
        color: '374151',
        bullet: { type: 'bullet' }
      });
    }

    // Strategic insights
    slide.addText('STRATEGIC INSIGHTS', {
      x: 5.5,
      y: 3,
      w: 4,
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    const insights = this.generateStrategicInsights(projectData);
    slide.addText(insights, {
      x: 5.5,
      y: 3.5,
      w: 4,
      h: 3,
      fontSize: 11,
      color: '374151'
    });
  }

  /**
   * Create resource overview slide with team efficiency metrics
   */
  private async createResourceOverviewSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('RESOURCE UTILIZATION & TEAM EFFICIENCY', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      color: theme.primary,
      bold: true
    });

    // Resource metrics
    const resourceUtilization = this.calculateResourceUtilization(projectData);
    const teamEfficiency = this.analytics.teamEfficiency;
    const collaborationScore = this.analytics.collaborationScore;

    // Resource utilization gauge
    slide.addText(`${resourceUtilization}%`, {
      x: 0.5,
      y: 1.5,
      w: 3,
      h: 1,
      fontSize: 36,
      color: resourceUtilization >= 80 ? '10B981' : resourceUtilization >= 65 ? 'F59E0B' : 'EF4444',
      bold: true,
      align: 'center'
    });

    slide.addText('Resource Utilization', {
      x: 0.5,
      y: 2.5,
      w: 3,
      h: 0.5,
      fontSize: 14,
      color: '374151',
      align: 'center'
    });

    // Team efficiency
    slide.addText(`${teamEfficiency}%`, {
      x: 3.8,
      y: 1.5,
      w: 3,
      h: 1,
      fontSize: 36,
      color: teamEfficiency >= 75 ? '10B981' : teamEfficiency >= 60 ? 'F59E0B' : 'EF4444',
      bold: true,
      align: 'center'
    });

    slide.addText('Team Efficiency', {
      x: 3.8,
      y: 2.5,
      w: 3,
      h: 0.5,
      fontSize: 14,
      color: '374151',
      align: 'center'
    });

    // Collaboration score
    slide.addText(`${collaborationScore}%`, {
      x: 7.1,
      y: 1.5,
      w: 3,
      h: 1,
      fontSize: 36,
      color: collaborationScore >= 75 ? '10B981' : collaborationScore >= 60 ? 'F59E0B' : 'EF4444',
      bold: true,
      align: 'center'
    });

    slide.addText('Collaboration Score', {
      x: 7.1,
      y: 2.5,
      w: 3,
      h: 0.5,
      fontSize: 14,
      color: '374151',
      align: 'center'
    });

    // Team composition analysis
    const teamAnalysis = this.analyzeTeamComposition(projectData);
    slide.addText('TEAM COMPOSITION ANALYSIS', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(teamAnalysis, {
      x: 0.5,
      y: 4,
      w: '90%',
      h: 2.5,
      fontSize: 12,
      color: '374151'
    });
  }

  /**
   * Create risk summary slide with executive-level risk assessment
   */
  private async createRiskSummarySlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('RISK ASSESSMENT & MITIGATION', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      color: theme.primary,
      bold: true
    });

    // Risk level indicator
    const riskLevel = this.analytics.riskLevel;
    const riskColor = riskLevel === 'low' ? '10B981' : riskLevel === 'medium' ? 'F59E0B' : 'EF4444';
    const riskMessage = riskLevel === 'low' ? 'CONTROLLED' : riskLevel === 'medium' ? 'MANAGED' : 'CRITICAL';

    slide.addText(`RISK LEVEL: ${riskMessage}`, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 1,
      fontSize: 32,
      color: riskColor,
      bold: true,
      align: 'center'
    });

    // Executive risk factors
    const executiveRisks = this.identifyExecutiveRisks(projectData);
    slide.addText('EXECUTIVE RISK FACTORS', {
      x: 0.5,
      y: 3,
      w: 4.5,
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(executiveRisks, {
      x: 0.5,
      y: 3.5,
      w: 4.5,
      h: 3,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Mitigation strategies
    const mitigationStrategies = this.generateExecutiveMitigationStrategies(projectData);
    slide.addText('MITIGATION STRATEGIES', {
      x: 5.5,
      y: 3,
      w: 4,
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(mitigationStrategies, {
      x: 5.5,
      y: 3.5,
      w: 4,
      h: 3,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create key decisions slide with actionable recommendations
   */
  private async createKeyDecisionsSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string; gradient: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('KEY DECISIONS REQUIRED', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      color: theme.primary,
      bold: true
    });

    // Decision priority matrix
    const decisions = this.identifyKeyDecisions(projectData);
    
    slide.addText('IMMEDIATE DECISIONS (Next 2 weeks)', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: 'EF4444',
      bold: true
    });

    const immediateDecisions = decisions.filter(d => d.priority === 'immediate');
    if (immediateDecisions.length > 0) {
      const immediateText = immediateDecisions.map(d => d.description).join('\n');
      slide.addText(immediateText, {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 1.5,
        fontSize: 12,
        color: '374151',
        bullet: { type: 'bullet' }
      });
    }

    slide.addText('STRATEGIC DECISIONS (Next 4-6 weeks)', {
      x: 0.5,
      y: 3.8,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: 'F59E0B',
      bold: true
    });

    const strategicDecisions = decisions.filter(d => d.priority === 'strategic');
    if (strategicDecisions.length > 0) {
      const strategicText = strategicDecisions.map(d => d.description).join('\n');
      slide.addText(strategicText, {
        x: 0.5,
        y: 4.3,
        w: '90%',
        h: 1.5,
        fontSize: 12,
        color: '374151',
        bullet: { type: 'bullet' }
      });
    }

    // Investment recommendations
    slide.addText('INVESTMENT RECOMMENDATIONS', {
      x: 0.5,
      y: 6,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: theme.primary,
      bold: true
    });

    const investmentRecs = this.generateInvestmentRecommendations(projectData);
    slide.addText(investmentRecs, {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 1,
      fontSize: 12,
      color: '374151'
    });
  }

  // Helper methods for executive-level analysis

  private getProjectHealthScore(): string {
    const score = Math.round((this.analytics.completionRate + this.analytics.teamEfficiency + this.analytics.qualityScore + this.analytics.timelineAdherence) / 4);
    return `${score}%`;
  }

  private getExecutiveStatusMessage(): string {
    const score = Math.round((this.analytics.completionRate + this.analytics.teamEfficiency + this.analytics.qualityScore) / 3);
    
    if (score >= 85) return 'Exceeding Expectations';
    if (score >= 75) return 'On Track for Success';
    if (score >= 65) return 'Meeting Standards';
    if (score >= 50) return 'Requires Attention';
    return 'Critical Intervention Needed';
  }

  private calculateResourceUtilization(projectData: ProjectData): number {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    if (team.length === 0) return 0;
    
    const assignedTasks = tasks.filter(task => task.assignee && task.assignee !== 'Unassigned').length;
    const utilization = Math.min(100, Math.round((assignedTasks / team.length) * 15));
    
    return utilization;
  }

  private generateExecutiveSummary(projectData: ProjectData): string {
    const completionRate = this.analytics.completionRate;
    const riskLevel = this.analytics.riskLevel;
    const teamSize = projectData.team?.length || 0;
    const taskCount = projectData.tasks?.length || 0;
    
    const summary = `Project ${projectData.name} demonstrates ${completionRate >= 80 ? 'strong' : completionRate >= 60 ? 'adequate' : 'concerning'} progress with ${completionRate}% completion rate across ${taskCount} tasks. Team of ${teamSize} showing ${this.analytics.teamEfficiency >= 75 ? 'high' : 'moderate'} efficiency. Risk exposure is currently ${riskLevel}, ${riskLevel === 'low' ? 'allowing for continued aggressive progress' : riskLevel === 'medium' ? 'requiring focused management attention' : 'demanding immediate executive intervention'}. Strategic position remains ${this.getStrategicPosition()} for planned objectives.`;
    
    return summary;
  }

  private getStrategicPosition(): string {
    const overallScore = (this.analytics.completionRate + this.analytics.teamEfficiency + this.analytics.qualityScore) / 3;
    return overallScore >= 80 ? 'strong' : overallScore >= 65 ? 'favorable' : overallScore >= 50 ? 'stable' : 'challenged';
  }

  private extractStrategicMilestones(projectData: ProjectData): Array<{ name: string; status: string; target: string }> {
    const milestones = [];
    const sprints = projectData.sprints || [];
    const tasks = projectData.tasks || [];
    
    // Create milestones from sprint data
    sprints.forEach(sprint => {
      const completion = parseFloat(sprint.completed.replace('%', '')) || 0;
      milestones.push({
        name: sprint.name,
        status: completion >= 90 ? 'completed' : completion >= 50 ? 'inprogress' : 'pending',
        target: new Date(sprint.endDate).toLocaleDateString()
      });
    });

    // Add task-based milestones if no sprints
    if (milestones.length === 0 && tasks.length > 0) {
      const completedTasks = tasks.filter(task => ['done', 'completed', 'closed'].includes(task.status.toLowerCase())).length;
      const totalTasks = tasks.length;
      
      milestones.push({
        name: 'Task Completion Phase',
        status: completedTasks === totalTasks ? 'completed' : completedTasks > 0 ? 'inprogress' : 'pending',
        target: 'Q4 2024'
      });
    }

    return milestones.slice(0, 5);
  }

  private generateStrategicInsights(projectData: ProjectData): string {
    const insights = [];
    
    if (this.analytics.velocityTrend === 'increasing') {
      insights.push('Project momentum is accelerating - consider advancing timeline targets.');
    } else if (this.analytics.velocityTrend === 'decreasing') {
      insights.push('Velocity decline detected - investigate resource constraints.');
    }
    
    if (this.analytics.teamEfficiency >= 85) {
      insights.push('Team operating at peak efficiency - opportunity for scope expansion.');
    }
    
    if (this.analytics.qualityScore >= 90) {
      insights.push('Quality metrics exceed standards - potential for early delivery.');
    }
    
    if (this.analytics.blockedItemsCount > 3) {
      insights.push('Multiple blockers identified - executive intervention recommended.');
    }

    return insights.join(' ') || 'Strategic position stable with standard operational metrics.';
  }

  private analyzeTeamComposition(projectData: ProjectData): string {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    const assigneeMap = new Map<string, number>();
    tasks.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned') {
        assigneeMap.set(task.assignee, (assigneeMap.get(task.assignee) || 0) + 1);
      }
    });

    const activeMembers = assigneeMap.size;
    const totalMembers = team.length;
    const utilizationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
    
    const topContributor = Array.from(assigneeMap.entries()).sort(([,a], [,b]) => b - a)[0];
    
    return `Team composition: ${totalMembers} total members, ${activeMembers} actively assigned (${utilizationRate}% utilization). ${topContributor ? `Primary contributor: ${topContributor[0]} with ${topContributor[1]} tasks assigned.` : ''} Resource distribution ${utilizationRate >= 80 ? 'optimal' : utilizationRate >= 60 ? 'adequate' : 'requires rebalancing'} for current project scope.`;
  }

  private identifyExecutiveRisks(projectData: ProjectData): string {
    const risks = [];
    
    if (this.analytics.blockedItemsCount > 2) {
      risks.push(`${this.analytics.blockedItemsCount} critical blockers impacting delivery timeline`);
    }
    
    if (this.analytics.timelineAdherence < 75) {
      risks.push('Timeline adherence below acceptable threshold - scope or resource adjustment needed');
    }
    
    if (this.analytics.teamEfficiency < 65) {
      risks.push('Team productivity concerns - potential skill gaps or process inefficiencies');
    }
    
    if (this.analytics.qualityScore < 70) {
      risks.push('Quality metrics below standards - increased technical debt risk');
    }

    return risks.length > 0 ? risks.join('\n') : 'No critical risk factors identified at executive level';
  }

  private generateExecutiveMitigationStrategies(projectData: ProjectData): string {
    const strategies = [];
    
    if (this.analytics.blockedItemsCount > 0) {
      strategies.push('Establish executive escalation process for blocker resolution');
    }
    
    if (this.analytics.teamEfficiency < 70) {
      strategies.push('Implement targeted training and process optimization initiatives');
    }
    
    if (this.analytics.riskLevel === 'high') {
      strategies.push('Deploy additional senior resources and increase monitoring frequency');
    }

    return strategies.length > 0 ? strategies.join('\n') : 'Continue standard risk management protocols';
  }

  private identifyKeyDecisions(projectData: ProjectData): Array<{ priority: string; description: string }> {
    const decisions = [];
    
    if (this.analytics.blockedItemsCount > 3) {
      decisions.push({
        priority: 'immediate',
        description: 'Authorize additional resources to resolve critical blockers'
      });
    }
    
    if (this.analytics.timelineAdherence < 70) {
      decisions.push({
        priority: 'immediate',
        description: 'Scope reduction or timeline extension decision required'
      });
    }
    
    if (this.analytics.teamEfficiency >= 85 && this.analytics.completionRate >= 80) {
      decisions.push({
        priority: 'strategic',
        description: 'Consider accelerating delivery timeline or expanding scope'
      });
    }
    
    if (projectData.platform === 'jira' && this.analytics.qualityScore >= 85) {
      decisions.push({
        priority: 'strategic',
        description: 'Evaluate advanced Jira automation implementation for efficiency gains'
      });
    }

    return decisions;
  }

  private generateInvestmentRecommendations(projectData: ProjectData): string {
    const recommendations = [];
    
    if (this.analytics.teamEfficiency >= 80) {
      recommendations.push('ROI positive for continued resource investment');
    }
    
    if (this.analytics.qualityScore >= 85) {
      recommendations.push('Quality metrics support premium delivery approach');
    }
    
    if (this.analytics.riskLevel === 'low' && this.analytics.completionRate >= 70) {
      recommendations.push('Low-risk profile enables aggressive growth strategy');
    }

    return recommendations.join('. ') || 'Maintain current investment strategy with quarterly reviews.';
  }
}