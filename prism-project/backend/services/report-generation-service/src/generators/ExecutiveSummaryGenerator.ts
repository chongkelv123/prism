// backend/services/report-generation-service/src/generators/ExecutiveSummaryGenerator.ts
// Executive Summary Template (5-7 slides) - Windows Compatible (No Unicode/Symbols)

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
   * Generate Executive Summary PowerPoint (5-7 slides)
   */
  async generate(
    projectData: ProjectData, 
    config: ExecutiveReportConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Executive Summary', {
        platform: projectData.platform,
        projectName: projectData.name
      });

      // Calculate enhanced analytics
      this.analytics = DataAnalyticsService.calculateAnalytics(projectData);

      // Initialize PowerPoint
      const pptx = new PptxGenJS();
      
      // Configure presentation
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Report System';
      pptx.company = 'Executive Analytics';
      pptx.subject = `Executive Summary - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - Executive Summary`;

      // Generate slides
      await this.createExecutiveTitleSlide(pptx, projectData, config);
      await progressCallback?.(15);

      await this.createProjectHealthDashboard(pptx, projectData);
      await progressCallback?.(30);

      await this.createStrategicProgressSlide(pptx, projectData);
      await progressCallback?.(50);

      await this.createResourceOverviewSlide(pptx, projectData);
      await progressCallback?.(70);

      await this.createRiskSummarySlide(pptx, projectData);
      await progressCallback?.(85);

      await this.createKeyDecisionsSlide(pptx, projectData);
      await progressCallback?.(95);

      // Add conditional slide for high-performing projects
      if (this.analytics.completionRate > 75 && this.analytics.teamEfficiency > 80) {
        await this.createSuccessHighlightsSlide(pptx, projectData);
      }

      // Save file
      const reportId = uuidv4();
      const fileName = `${reportId}_executive_summary.pptx`;
      const filePath = path.join(this.STORAGE_DIR, fileName);

      await pptx.writeFile({ fileName: filePath });
      await progressCallback?.(100);

      logger.info(`Executive Summary generated: ${fileName}`);
      return filePath;

    } catch (error) {
      logger.error('Error generating Executive Summary:', error);
      throw new Error('Failed to generate Executive Summary');
    }
  }

  /**
   * Create executive title slide with key highlights
   */
  private async createExecutiveTitleSlide(pptx: PptxGenJS, projectData: ProjectData, config: ExecutiveReportConfig): Promise<void> {
    const slide = pptx.addSlide();

    // Gradient background for executive feel
    const bgColor = projectData.platform === 'jira' ? '1A365D' : 
                   projectData.platform === 'monday' ? '702459' : '4C1D95';

    slide.background = { color: bgColor };

    // Main title
    slide.addText(config.title || `${projectData.name}`, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 1.2,
      fontSize: 48,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Subtitle
    slide.addText('EXECUTIVE SUMMARY', {
      x: 1,
      y: 2.8,
      w: 8,
      h: 0.8,
      fontSize: 28,
      color: 'E2E8F0',
      align: 'center',
      italic: true
    });

    // Key metrics overview box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 2,
      y: 4,
      w: 6,
      h: 2.5,
      fill: { color: 'FFFFFF', transparency: 10 },
      line: { color: 'FFFFFF', width: 2 }
    });

    // Executive summary metrics
    const executiveMetrics = [
      `PROJECT STATUS: ${projectData.status.toUpperCase()}`,
      `COMPLETION: ${this.analytics.completionRate}% | RISK: ${this.analytics.riskLevel.toUpperCase()}`,
      `TEAM EFFICIENCY: ${this.analytics.teamEfficiency}% | QUALITY: ${this.analytics.qualityScore}%`,
      `ESTIMATED DELIVERY: ${this.analytics.estimatedCompletion}`
    ];

    slide.addText(executiveMetrics.join('\n'), {
      x: 2.3,
      y: 4.3,
      w: 5.4,
      h: 1.9,
      fontSize: 16,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Date and confidentiality
    slide.addText(`Generated: ${new Date().toLocaleDateString()} | CONFIDENTIAL - Executive Use Only`, {
      x: 1,
      y: 6.8,
      w: 8,
      h: 0.4,
      fontSize: 12,
      color: 'CBD5E0',
      align: 'center'
    });
  }

  /**
   * Create project health dashboard
   */
  private async createProjectHealthDashboard(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('PROJECT HEALTH DASHBOARD', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Health status indicator - large visual
    const healthScore = Math.round((this.analytics.completionRate + this.analytics.teamEfficiency + this.analytics.qualityScore) / 3);
    const healthColor = healthScore >= 80 ? '48BB78' : healthScore >= 60 ? 'ED8936' : 'E53E3E';
    const healthStatus = healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'CAUTION' : 'CRITICAL';

    // Large health indicator circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 1.5,
      y: 1.5,
      w: 2.5,
      h: 2.5,
      fill: { color: healthColor },
      line: { color: healthColor, width: 0 }
    });

    slide.addText(healthStatus, {
      x: 1.7,
      y: 2.3,
      w: 2.1,
      h: 0.6,
      fontSize: 20,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    slide.addText(`${healthScore}%`, {
      x: 1.7,
      y: 2.9,
      w: 2.1,
      h: 0.4,
      fontSize: 16,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Key performance indicators
    const kpis = [
      { label: 'COMPLETION RATE', value: `${this.analytics.completionRate}%`, target: '85%' },
      { label: 'TEAM EFFICIENCY', value: `${this.analytics.teamEfficiency}%`, target: '80%' },
      { label: 'QUALITY SCORE', value: `${this.analytics.qualityScore}%`, target: '90%' },
      { label: 'TIMELINE ADHERENCE', value: `${this.analytics.timelineAdherence}%`, target: '95%' }
    ];

    kpis.forEach((kpi, index) => {
      const x = 4.5 + (index % 2) * 2.5;
      const y = 1.5 + Math.floor(index / 2) * 1.5;

      // KPI box
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 2.3,
        h: 1.2,
        fill: { color: 'F8F9FA' },
        line: { color: 'E2E8F0', width: 1 }
      });

      // KPI label
      slide.addText(kpi.label, {
        x: x + 0.1,
        y: y + 0.1,
        w: 2.1,
        h: 0.3,
        fontSize: 10,
        color: '4A5568',
        bold: true,
        align: 'center'
      });

      // KPI value
      slide.addText(kpi.value, {
        x: x + 0.1,
        y: y + 0.45,
        w: 2.1,
        h: 0.4,
        fontSize: 20,
        color: '2D3748',
        bold: true,
        align: 'center'
      });

      // Target
      slide.addText(`Target: ${kpi.target}`, {
        x: x + 0.1,
        y: y + 0.85,
        w: 2.1,
        h: 0.25,
        fontSize: 9,
        color: '718096',
        align: 'center'
      });
    });

    // Critical alerts section
    slide.addText('CRITICAL ALERTS', {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '1A202C',
      bold: true
    });

    const alerts = [];
    if (this.analytics.riskLevel === 'high') {
      alerts.push(`HIGH RISK: ${this.analytics.blockedItemsCount} blocked items require immediate attention`);
    }
    if (this.analytics.timelineAdherence < 70) {
      alerts.push(`TIMELINE RISK: Project is ${100 - this.analytics.timelineAdherence}% behind schedule`);
    }
    if (this.analytics.teamEfficiency < 60) {
      alerts.push(`RESOURCE RISK: Team efficiency below acceptable threshold`);
    }
    
    if (alerts.length === 0) {
      alerts.push('No critical alerts - project tracking within acceptable parameters');
    }

    slide.addText(alerts.join('\n'), {
      x: 0.5,
      y: 5,
      w: '90%',
      h: 1.5,
      fontSize: 14,
      color: alerts.length > 1 ? 'E53E3E' : '48BB78',
      bullet: { type: 'bullet' }
    });

    // Executive summary box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 6.2,
      w: 9,
      h: 1,
      fill: { color: '2D3748' },
      line: { color: '2D3748', width: 0 }
    });

    const summaryText = this.analytics.completionRate >= 80 ? 
      'Project is performing well and on track for successful delivery.' :
      this.analytics.completionRate >= 60 ?
      'Project shows moderate progress with some areas requiring attention.' :
      'Project requires immediate intervention to meet delivery objectives.';

    slide.addText(`EXECUTIVE SUMMARY: ${summaryText}`, {
      x: 0.8,
      y: 6.5,
      w: 8.4,
      h: 0.6,
      fontSize: 14,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });
  }

  /**
   * Create strategic progress slide
   */
  private async createStrategicProgressSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('STRATEGIC PROGRESS', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Progress visualization - milestone timeline
    slide.addText('MILESTONE PROGRESS', {
      x: 0.5,
      y: 1.3,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    // Simplified milestone progress bar
    const milestones = [
      { name: 'INITIATION', status: 'completed', progress: 100 },
      { name: 'PLANNING', status: 'completed', progress: 100 },
      { name: 'EXECUTION', status: 'in-progress', progress: this.analytics.completionRate },
      { name: 'DELIVERY', status: 'pending', progress: Math.max(0, this.analytics.completionRate - 20) },
      { name: 'CLOSURE', status: 'pending', progress: Math.max(0, this.analytics.completionRate - 40) }
    ];

    milestones.forEach((milestone, index) => {
      const x = 1 + index * 1.6;
      const y = 2;

      // Milestone circle
      const color = milestone.status === 'completed' ? '48BB78' : 
                   milestone.status === 'in-progress' ? 'ED8936' : 'CBD5E0';

      slide.addShape(pptx.ShapeType.ellipse, {
        x,
        y,
        w: 0.6,
        h: 0.6,
        fill: { color },
        line: { color, width: 0 }
      });

      // Progress percentage in circle
      slide.addText(`${milestone.progress}%`, {
        x: x + 0.05,
        y: y + 0.15,
        w: 0.5,
        h: 0.3,
        fontSize: 10,
        color: 'FFFFFF',
        bold: true,
        align: 'center'
      });

      // Milestone name
      slide.addText(milestone.name, {
        x: x - 0.3,
        y: y + 0.8,
        w: 1.2,
        h: 0.3,
        fontSize: 11,
        color: '2D3748',
        bold: true,
        align: 'center'
      });

      // Connection line to next milestone
      if (index < milestones.length - 1) {
        slide.addShape(pptx.ShapeType.line, {
          x: x + 0.6,
          y: y + 0.3,
          w: 1,
          h: 0,
          line: { color: 'E2E8F0', width: 2 }
        });
      }
    });

    // Strategic objectives
    slide.addText('STRATEGIC OBJECTIVES STATUS', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const objectives = [
      { 
        name: 'Deliver on Time', 
        status: this.analytics.timelineAdherence >= 90 ? 'ON_TRACK' : this.analytics.timelineAdherence >= 70 ? 'AT_RISK' : 'CRITICAL',
        detail: `${this.analytics.timelineAdherence}% timeline adherence`
      },
      { 
        name: 'Quality Standards', 
        status: this.analytics.qualityScore >= 80 ? 'ON_TRACK' : this.analytics.qualityScore >= 60 ? 'AT_RISK' : 'CRITICAL',
        detail: `${this.analytics.qualityScore}% quality score`
      },
      { 
        name: 'Resource Efficiency', 
        status: this.analytics.teamEfficiency >= 80 ? 'ON_TRACK' : this.analytics.teamEfficiency >= 60 ? 'AT_RISK' : 'CRITICAL',
        detail: `${this.analytics.teamEfficiency}% team efficiency`
      },
      { 
        name: 'Risk Management', 
        status: this.analytics.riskLevel === 'low' ? 'ON_TRACK' : this.analytics.riskLevel === 'medium' ? 'AT_RISK' : 'CRITICAL',
        detail: `${this.analytics.riskLevel} risk level`
      }
    ];

    objectives.forEach((objective, index) => {
      const y = 4.1 + index * 0.6;
      const statusColor = objective.status === 'ON_TRACK' ? '48BB78' : 
                         objective.status === 'AT_RISK' ? 'ED8936' : 'E53E3E';

      // Status indicator
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.8,
        y: y + 0.1,
        w: 0.3,
        h: 0.3,
        fill: { color: statusColor },
        line: { color: statusColor, width: 0 }
      });

      // Objective name
      slide.addText(objective.name, {
        x: 1.3,
        y: y,
        w: 3,
        h: 0.5,
        fontSize: 16,
        color: '2D3748',
        bold: true
      });

      // Status text
      slide.addText(objective.status.replace('_', ' '), {
        x: 4.5,
        y: y,
        w: 1.5,
        h: 0.5,
        fontSize: 14,
        color: statusColor,
        bold: true
      });

      // Detail
      slide.addText(objective.detail, {
        x: 6.2,
        y: y,
        w: 3,
        h: 0.5,
        fontSize: 14,
        color: '4A5568'
      });
    });
  }

  /**
   * Create resource overview slide
   */
  private async createResourceOverviewSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('RESOURCE OVERVIEW', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Team capacity overview
    slide.addText('TEAM CAPACITY', {
      x: 0.5,
      y: 1.3,
      w: 4,
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const teamSize = projectData.team?.length || 0;
    const totalTasks = projectData.tasks?.length || 0;
    const avgTasksPerMember = teamSize > 0 ? Math.round(totalTasks / teamSize) : 0;

    const teamMetrics = [
      `Team Size: ${teamSize} members`,
      `Active Tasks: ${totalTasks}`,
      `Average Load: ${avgTasksPerMember} tasks/member`,
      `Collaboration Score: ${this.analytics.collaborationScore}%`
    ];

    slide.addText(teamMetrics.join('\n'), {
      x: 0.5,
      y: 1.8,
      w: 4,
      h: 2,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Resource utilization chart
    slide.addText('UTILIZATION ANALYSIS', {
      x: 5,
      y: 1.3,
      w: 4,
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    // Simplified utilization visualization
    const overutilized = this.analytics.workloadDistribution.filter(m => m.utilization > 120).length;
    const balanced = this.analytics.workloadDistribution.filter(m => m.utilization >= 80 && m.utilization <= 120).length;
    const underutilized = this.analytics.workloadDistribution.filter(m => m.utilization < 80).length;

    const utilizationData = [
      { label: 'Over-utilized (>120%)', count: overutilized, color: 'E53E3E' },
      { label: 'Well-balanced (80-120%)', count: balanced, color: '48BB78' },
      { label: 'Under-utilized (<80%)', count: underutilized, color: 'ED8936' }
    ];

    utilizationData.forEach((data, index) => {
      const y = 1.8 + index * 0.6;
      
      // Utilization bar
      const barWidth = teamSize > 0 ? (data.count / teamSize) * 3 : 0;
      slide.addShape(pptx.ShapeType.rect, {
        x: 5.3,
        y: y + 0.1,
        w: Math.max(barWidth, 0.1),
        h: 0.3,
        fill: { color: data.color },
        line: { color: data.color, width: 0 }
      });

      // Label and count
      slide.addText(`${data.label}: ${data.count}`, {
        x: 5,
        y: y,
        w: 4,
        h: 0.5,
        fontSize: 14,
        color: '2D3748'
      });
    });

    // Resource recommendations
    slide.addText('RESOURCE RECOMMENDATIONS', {
      x: 0.5,
      y: 4.2,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const recommendations = [];
    if (overutilized > 0) {
      recommendations.push(`PRIORITY: Redistribute workload for ${overutilized} over-utilized team members`);
    }
    if (underutilized > 0) {
      recommendations.push(`OPPORTUNITY: ${underutilized} team members have capacity for additional work`);
    }
    if (this.analytics.collaborationScore < 70) {
      recommendations.push('IMPROVE: Team collaboration below optimal level - consider team building initiatives');
    }
    if (recommendations.length === 0) {
      recommendations.push('EXCELLENT: Team resources are well-balanced and efficiently utilized');
    }

    slide.addText(recommendations.join('\n'), {
      x: 0.5,
      y: 4.7,
      w: '90%',
      h: 2,
      fontSize: 14,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create risk summary slide
   */
  private async createRiskSummarySlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('RISK SUMMARY & MITIGATION', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Risk level indicator - prominent display
    const riskColor = this.analytics.riskLevel === 'high' ? 'E53E3E' : 
                     this.analytics.riskLevel === 'medium' ? 'ED8936' : '48BB78';

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1,
      y: 1.3,
      w: 8,
      h: 1.2,
      fill: { color: riskColor },
      line: { color: riskColor, width: 0 }
    });

    slide.addText(`OVERALL RISK LEVEL: ${this.analytics.riskLevel.toUpperCase()}`, {
      x: 1.5,
      y: 1.6,
      w: 7,
      h: 0.6,
      fontSize: 28,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Risk factors breakdown
    slide.addText('RISK FACTORS', {
      x: 0.5,
      y: 2.8,
      w: 4.5,
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const riskFactors = [
      { 
        factor: 'Blocked Tasks', 
        value: this.analytics.blockedItemsCount,
        risk: this.analytics.blockedItemsCount > 5 ? 'HIGH' : this.analytics.blockedItemsCount > 2 ? 'MEDIUM' : 'LOW'
      },
      { 
        factor: 'Timeline Adherence', 
        value: `${this.analytics.timelineAdherence}%`,
        risk: this.analytics.timelineAdherence < 70 ? 'HIGH' : this.analytics.timelineAdherence < 85 ? 'MEDIUM' : 'LOW'
      },
      { 
        factor: 'Quality Score', 
        value: `${this.analytics.qualityScore}%`,
        risk: this.analytics.qualityScore < 60 ? 'HIGH' : this.analytics.qualityScore < 80 ? 'MEDIUM' : 'LOW'
      },
      { 
        factor: 'Team Efficiency', 
        value: `${this.analytics.teamEfficiency}%`,
        risk: this.analytics.teamEfficiency < 60 ? 'HIGH' : this.analytics.teamEfficiency < 80 ? 'MEDIUM' : 'LOW'
      }
    ];

    // Risk factors table
    const riskTableData: any[] = [
      [
        { text: 'Risk Factor', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Current Value', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Risk Level', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } }
      ]
    ];

    riskFactors.forEach(risk => {
      const riskColor = risk.risk === 'HIGH' ? 'E53E3E' : risk.risk === 'MEDIUM' ? 'ED8936' : '48BB78';
      riskTableData.push([
        { text: risk.factor, options: { fontSize: 12, color: '2D3748' } },
        { text: risk.value.toString(), options: { fontSize: 12, color: '2D3748' } },
        { text: risk.risk, options: { fontSize: 12, color: riskColor, bold: true } }
      ]);
    });

    slide.addTable(riskTableData, {
      x: 0.5,
      y: 3.3,
      w: 4.5,
      colW: [2, 1.5, 1],
      border: { pt: 1, color: 'E2E8F0' }
    });

    // Mitigation strategies
    slide.addText('MITIGATION STRATEGIES', {
      x: 5.5,
      y: 2.8,
      w: 4,
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const mitigationStrategies = this.analytics.recommendedActions.slice(0, 4);
    
    slide.addText(mitigationStrategies.join('\n'), {
      x: 5.5,
      y: 3.3,
      w: 4,
      h: 2.5,
      fontSize: 14,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Executive action required
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 6.2,
      w: 9,
      h: 1,
      fill: { color: this.analytics.riskLevel === 'high' ? 'E53E3E' : '2D3748' },
      line: { color: this.analytics.riskLevel === 'high' ? 'E53E3E' : '2D3748', width: 0 }
    });

    const actionRequired = this.analytics.riskLevel === 'high' ? 
      'EXECUTIVE ACTION REQUIRED: Immediate intervention needed to address high-risk factors' :
      this.analytics.riskLevel === 'medium' ?
      'MANAGEMENT ATTENTION: Monitor closely and implement mitigation strategies' :
      'STATUS: Risk levels are within acceptable parameters';

    slide.addText(actionRequired, {
      x: 0.8,
      y: 6.5,
      w: 8.4,
      h: 0.6,
      fontSize: 14,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });
  }

  /**
   * Create key decisions slide
   */
  private async createKeyDecisionsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('KEY DECISIONS REQUIRED', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Immediate decisions
    slide.addText('IMMEDIATE DECISIONS (Next 2 weeks)', {
      x: 0.5,
      y: 1.3,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const immediateDecisions = [];
    if (this.analytics.riskLevel === 'high') {
      immediateDecisions.push('DECISION: Approve additional resources to address high-risk factors');
    }
    if (this.analytics.blockedItemsCount > 3) {
      immediateDecisions.push('DECISION: Authorize escalation process for blocked items resolution');
    }
    if (this.analytics.timelineAdherence < 70) {
      immediateDecisions.push('DECISION: Approve scope reduction or timeline extension to meet delivery objectives');
    }
    if (immediateDecisions.length === 0) {
      immediateDecisions.push('No immediate executive decisions required - project tracking as planned');
    }

    slide.addText(immediateDecisions.join('\n'), {
      x: 0.5,
      y: 1.8,
      w: '90%',
      h: 1.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Strategic decisions
    slide.addText('STRATEGIC DECISIONS (Next month)', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const strategicDecisions = [
      'DECISION: Resource allocation for subsequent project phases',
      'DECISION: Quality standards vs. delivery timeline optimization',
      'DECISION: Team scaling strategy based on current performance metrics',
      `DECISION: Risk tolerance levels for ${this.analytics.estimatedCompletion} delivery target`
    ];

    slide.addText(strategicDecisions.join('\n'), {
      x: 0.5,
      y: 4,
      w: '90%',
      h: 2,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Financial impact considerations
    slide.addText('FINANCIAL IMPACT CONSIDERATIONS', {
      x: 0.5,
      y: 6.2,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const financialConsiderations = [
      'Budget impact of proposed mitigation strategies',
      'Cost of delay vs. cost of additional resources',
      'ROI implications of current performance trajectory'
    ];

    slide.addText(financialConsiderations.join('\n'), {
      x: 0.5,
      y: 6.7,
      w: '90%',
      h: 1,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create success highlights slide (conditional)
   */
  private async createSuccessHighlightsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('SUCCESS HIGHLIGHTS', {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: 32,
      color: '1A202C',
      bold: true,
      align: 'center'
    });

    // Success metrics showcase
    const successMetrics = [
      { metric: 'Project Completion', value: `${this.analytics.completionRate}%`, benchmark: '85%' },
      { metric: 'Team Efficiency', value: `${this.analytics.teamEfficiency}%`, benchmark: '80%' },
      { metric: 'Quality Standards', value: `${this.analytics.qualityScore}%`, benchmark: '90%' },
      { metric: 'Timeline Performance', value: `${this.analytics.timelineAdherence}%`, benchmark: '95%' }
    ];

    successMetrics.forEach((metric, index) => {
      const x = 0.5 + (index % 2) * 4.5;
      const y = 1.5 + Math.floor(index / 2) * 1.5;

      // Success metric box
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 4,
        h: 1.2,
        fill: { color: '48BB78' },
        line: { color: '48BB78', width: 0 }
      });

      slide.addText(metric.metric, {
        x: x + 0.2,
        y: y + 0.1,
        w: 3.6,
        h: 0.4,
        fontSize: 14,
        color: 'FFFFFF',
        bold: true,
        align: 'center'
      });

      slide.addText(metric.value, {
        x: x + 0.2,
        y: y + 0.5,
        w: 3.6,
        h: 0.5,
        fontSize: 24,
        color: 'FFFFFF',
        bold: true,
        align: 'center'
      });

      slide.addText(`Exceeds ${metric.benchmark} target`, {
        x: x + 0.2,
        y: y + 0.95,
        w: 3.6,
        h: 0.2,
        fontSize: 10,
        color: 'E6FFFA',
        align: 'center'
      });
    });

    // Key achievements
    slide.addText('KEY ACHIEVEMENTS', {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.4,
      fontSize: 18,
      color: '2D3748',
      bold: true
    });

    const achievements = [
      `Outstanding team performance: ${this.analytics.teamEfficiency}% efficiency`,
      `Quality excellence: ${this.analytics.qualityScore}% quality score maintained`,
      `Strong project momentum: ${this.analytics.velocityTrend} velocity trend`,
      `Effective risk management: ${this.analytics.riskLevel} risk level maintained`
    ];

    slide.addText(achievements.join('\n'), {
      x: 0.5,
      y: 5,
      w: '90%',
      h: 1.5,
      fontSize: 16,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Recommendation for continued success
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 6.8,
      w: 9,
      h: 0.6,
      fill: { color: '48BB78' },
      line: { color: '48BB78', width: 0 }
    });

    slide.addText('RECOMMENDATION: Continue current strategy and resource allocation for sustained success', {
      x: 0.8,
      y: 7,
      w: 8.4,
      h: 0.3,
      fontSize: 14,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });
  }
}