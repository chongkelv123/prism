// backend/services/report-generation-service/src/services/DataAnalyticsService.ts
// Enhanced Data Analytics Service - Windows Compatible (No Unicode/Symbols)

import logger from '../utils/logger';
import { ProjectData } from './PlatformDataService';

export interface AnalyticsMetrics {
  // Performance Metrics
  completionRate: number;
  velocityTrend: 'increasing' | 'decreasing' | 'stable';
  teamEfficiency: number;
  qualityScore: number;
  
  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high';
  blockedItemsCount: number;
  overdueTasks: number;
  timelineAdherence: number;
  
  // Team Analytics
  workloadDistribution: { member: string; taskCount: number; utilization: number }[];
  collaborationScore: number;
  
  // Trend Analysis
  burndownTrend: { date: string; remaining: number; ideal: number }[];
  statusDistribution: { status: string; count: number; percentage: number }[];
  priorityBreakdown: { priority: string; count: number; percentage: number }[];
  
  // Predictive Insights
  estimatedCompletion: string;
  recommendedActions: string[];
  criticalPath: string[];
}

export interface TemplateMetrics {
  standard: {
    slideCount: number;
    features: string[];
    estimatedGenTime: number;
  };
  executive: {
    slideCount: number;
    features: string[];
    estimatedGenTime: number;
  };
  detailed: {
    slideCount: number;
    features: string[];
    estimatedGenTime: number;
  };
}

export class DataAnalyticsService {
  /**
   * Calculate comprehensive analytics for project data
   */
  static calculateAnalytics(projectData: ProjectData): AnalyticsMetrics {
    try {
      logger.info('Calculating enhanced analytics', {
        platform: projectData.platform,
        taskCount: projectData.tasks?.length || 0,
        teamSize: projectData.team?.length || 0
      });

      // Calculate completion rate
      const completionRate = this.calculateCompletionRate(projectData);
      
      // Analyze velocity trends
      const velocityTrend = this.analyzeVelocityTrend(projectData);
      
      // Calculate team efficiency
      const teamEfficiency = this.calculateTeamEfficiency(projectData);
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(projectData);
      
      // Assess risk level
      const riskAssessment = this.assessRiskLevel(projectData);
      
      // Analyze workload distribution
      const workloadDistribution = this.analyzeWorkloadDistribution(projectData);
      
      // Calculate collaboration score
      const collaborationScore = this.calculateCollaborationScore(projectData);
      
      // Generate trend analysis
      const trendAnalysis = this.generateTrendAnalysis(projectData);
      
      // Generate predictive insights
      const predictiveInsights = this.generatePredictiveInsights(projectData);

      return {
        completionRate,
        velocityTrend,
        teamEfficiency,
        qualityScore,
        riskLevel: riskAssessment.level,
        blockedItemsCount: riskAssessment.blockedItems,
        overdueTasks: riskAssessment.overdueTasks,
        timelineAdherence: riskAssessment.timelineAdherence,
        workloadDistribution,
        collaborationScore,
        burndownTrend: trendAnalysis.burndown,
        statusDistribution: trendAnalysis.statusDist,
        priorityBreakdown: trendAnalysis.priorityBreakdown,
        estimatedCompletion: predictiveInsights.completion,
        recommendedActions: predictiveInsights.actions,
        criticalPath: predictiveInsights.criticalPath
      };

    } catch (error) {
      logger.error('Error calculating analytics:', error);
      return this.getFallbackAnalytics();
    }
  }

  /**
   * Get template-specific metrics for UI preview
   */
  static getTemplateMetrics(projectData: ProjectData): TemplateMetrics {
    const taskCount = projectData.tasks?.length || 0;
    const teamSize = projectData.team?.length || 0;
    const hasMetrics = (projectData.metrics?.length || 0) > 0;
    const hasSprints = (projectData.sprints?.length || 0) > 0;

    return {
      standard: {
        slideCount: 8 + (hasSprints ? 2 : 0) + (teamSize > 5 ? 1 : 0),
        features: [
          'Project Overview',
          'Key Metrics Dashboard',
          'Task Status Analysis',
          'Team Performance',
          'Timeline Analysis',
          'Risk Assessment',
          'Progress Summary',
          'Next Steps'
        ],
        estimatedGenTime: 45
      },
      executive: {
        slideCount: 5 + (hasMetrics ? 1 : 0) + (taskCount > 50 ? 1 : 0),
        features: [
          'Executive Summary',
          'Project Health Dashboard',
          'Strategic Progress',
          'Resource Overview',
          'Risk Summary',
          'Key Decisions Required'
        ],
        estimatedGenTime: 30
      },
      detailed: {
        slideCount: 15 + (hasSprints ? 3 : 0) + (teamSize > 3 ? 2 : 0) + (taskCount > 20 ? 2 : 0),
        features: [
          'Comprehensive Overview',
          'Detailed Metrics Analysis',
          'Performance Trends',
          'Quality Metrics',
          'Team Analytics',
          'Sprint Breakdowns',
          'Task Deep-Dive',
          'Bottleneck Analysis',
          'Predictive Insights',
          'Detailed Recommendations'
        ],
        estimatedGenTime: 90
      }
    };
  }

  /**
   * Calculate task completion rate
   */
  private static calculateCompletionRate(projectData: ProjectData): number {
    const tasks = projectData.tasks || [];
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => 
      ['done', 'completed', 'closed', 'resolved'].includes(task.status.toLowerCase())
    ).length;

    return Math.round((completedTasks / tasks.length) * 100);
  }

  /**
   * Analyze velocity trends based on sprints or task completion dates
   */
  private static analyzeVelocityTrend(projectData: ProjectData): 'increasing' | 'decreasing' | 'stable' {
    const sprints = projectData.sprints || [];
    
    if (sprints.length < 2) {
      // Fallback to task analysis if no sprints
      const tasks = projectData.tasks || [];
      const recentTasks = tasks.filter(task => 
        task.updated && new Date(task.updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      
      const completedRecent = recentTasks.filter(task => 
        ['done', 'completed', 'closed'].includes(task.status.toLowerCase())
      ).length;
      
      const totalRecent = recentTasks.length;
      const recentRate = totalRecent > 0 ? completedRecent / totalRecent : 0;
      
      return recentRate > 0.7 ? 'increasing' : recentRate < 0.3 ? 'decreasing' : 'stable';
    }

    // Analyze sprint completion rates
    const sprintRates = sprints.map(sprint => {
      const completed = parseFloat(sprint.completed.replace('%', '')) || 0;
      return completed;
    });

    const recent = sprintRates.slice(-2);
    if (recent.length === 2) {
      const [prev, current] = recent;
      if (current > prev + 10) return 'increasing';
      if (current < prev - 10) return 'decreasing';
    }
    
    return 'stable';
  }

  /**
   * Calculate team efficiency based on task assignments and completion
   */
  private static calculateTeamEfficiency(projectData: ProjectData): number {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    if (team.length === 0 || tasks.length === 0) return 0;

    const assignedTasks = tasks.filter(task => task.assignee && task.assignee !== 'Unassigned');
    const completedAssigned = assignedTasks.filter(task => 
      ['done', 'completed', 'closed'].includes(task.status.toLowerCase())
    );

    const assignmentRate = assignedTasks.length / tasks.length;
    const completionRate = assignedTasks.length > 0 ? completedAssigned.length / assignedTasks.length : 0;
    const teamUtilization = Math.min(assignedTasks.length / team.length, 1);

    return Math.round((assignmentRate * 0.3 + completionRate * 0.5 + teamUtilization * 0.2) * 100);
  }

  /**
   * Calculate quality score based on various factors
   */
  private static calculateQualityScore(projectData: ProjectData): number {
    const tasks = projectData.tasks || [];
    if (tasks.length === 0) return 0;

    // Quality indicators
    const hasDescription = tasks.filter(task => task.name && task.name.length > 10).length;
    const hasAssignee = tasks.filter(task => task.assignee && task.assignee !== 'Unassigned').length;
    const recentUpdates = tasks.filter(task => 
      task.updated && new Date(task.updated) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const descriptionScore = hasDescription / tasks.length;
    const assignmentScore = hasAssignee / tasks.length;
    const activityScore = Math.min(recentUpdates / tasks.length, 1);

    return Math.round((descriptionScore * 0.3 + assignmentScore * 0.4 + activityScore * 0.3) * 100);
  }

  /**
   * Assess overall risk level
   */
  private static assessRiskLevel(projectData: ProjectData): {
    level: 'low' | 'medium' | 'high';
    blockedItems: number;
    overdueTasks: number;
    timelineAdherence: number;
  } {
    const tasks = projectData.tasks || [];
    
    // Count blocked items
    const blockedItems = tasks.filter(task => 
      ['blocked', 'stuck', 'on hold'].includes(task.status.toLowerCase())
    ).length;

    // Count overdue tasks (simplified - would need due dates in real implementation)
    const overdueTasks = tasks.filter(task => 
      task.updated && new Date(task.updated) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
      !['done', 'completed', 'closed'].includes(task.status.toLowerCase())
    ).length;

    // Calculate timeline adherence
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => 
      ['done', 'completed', 'closed'].includes(task.status.toLowerCase())
    ).length;
    
    const timelineAdherence = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (blockedItems > totalTasks * 0.1 || overdueTasks > totalTasks * 0.2 || timelineAdherence < 50) {
      riskLevel = 'high';
    } else if (blockedItems > totalTasks * 0.05 || overdueTasks > totalTasks * 0.1 || timelineAdherence < 75) {
      riskLevel = 'medium';
    }

    return {
      level: riskLevel,
      blockedItems,
      overdueTasks,
      timelineAdherence
    };
  }

  /**
   * Analyze workload distribution across team members
   */
  private static analyzeWorkloadDistribution(projectData: ProjectData): Array<{
    member: string;
    taskCount: number;
    utilization: number;
  }> {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    // Count tasks per team member
    const taskCounts: { [key: string]: number } = {};
    tasks.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned') {
        taskCounts[task.assignee] = (taskCounts[task.assignee] || 0) + 1;
      }
    });

    // Calculate utilization (task count relative to average)
    const totalAssigned = Object.values(taskCounts).reduce((sum, count) => sum + count, 0);
    const averageTasks = team.length > 0 ? totalAssigned / team.length : 0;

    return team.map(member => {
      const taskCount = taskCounts[member.name] || 0;
      const utilization = averageTasks > 0 ? Math.round((taskCount / averageTasks) * 100) : 0;
      
      return {
        member: member.name,
        taskCount,
        utilization: Math.min(utilization, 150) // Cap at 150%
      };
    });
  }

  /**
   * Calculate collaboration score
   */
  private static calculateCollaborationScore(projectData: ProjectData): number {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    if (team.length < 2) return 0;

    const assignedTasks = tasks.filter(task => task.assignee && task.assignee !== 'Unassigned');
    const uniqueAssignees = new Set(assignedTasks.map(task => task.assignee)).size;
    
    const teamInvolvement = uniqueAssignees / team.length;
    const taskDistribution = assignedTasks.length / tasks.length;

    return Math.round((teamInvolvement * 0.6 + taskDistribution * 0.4) * 100);
  }

  /**
   * Generate trend analysis data
   */
  private static generateTrendAnalysis(projectData: ProjectData): {
    burndown: Array<{ date: string; remaining: number; ideal: number }>;
    statusDist: Array<{ status: string; count: number; percentage: number }>;
    priorityBreakdown: Array<{ priority: string; count: number; percentage: number }>;
  } {
    const tasks = projectData.tasks || [];
    
    // Status distribution
    const statusCounts: { [key: string]: number } = {};
    tasks.forEach(task => {
      const status = task.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / tasks.length) * 100)
    }));

    // Priority breakdown (simplified)
    const priorityBreakdown = [
      { priority: 'High', count: Math.floor(tasks.length * 0.2), percentage: 20 },
      { priority: 'Medium', count: Math.floor(tasks.length * 0.5), percentage: 50 },
      { priority: 'Low', count: Math.floor(tasks.length * 0.3), percentage: 30 }
    ];

    // Simplified burndown (would need historical data in real implementation)
    const burndown = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remaining: Math.max(tasks.length - (i * tasks.length / 10), 0),
      ideal: Math.max(tasks.length - (i * tasks.length / 9), 0)
    }));

    return { burndown, statusDist, priorityBreakdown };
  }

  /**
   * Generate predictive insights
   */
  private static generatePredictiveInsights(projectData: ProjectData): {
    completion: string;
    actions: string[];
    criticalPath: string[];
  } {
    const tasks = projectData.tasks || [];
    const completedTasks = tasks.filter(task => 
      ['done', 'completed', 'closed'].includes(task.status.toLowerCase())
    ).length;
    
    const remainingTasks = tasks.length - completedTasks;
    const completionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;
    
    // Estimate completion date
    const daysToComplete = completionRate > 0 ? Math.ceil(remainingTasks / (completionRate * 7)) : 30;
    const estimatedCompletion = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toLocaleDateString();

    // Generate recommendations
    const actions: string[] = [];
    
    if (completionRate < 0.5) {
      actions.push('Focus on completing high-priority tasks');
      actions.push('Consider reallocating resources');
    }
    
    const blockedTasks = tasks.filter(task => 
      ['blocked', 'stuck'].includes(task.status.toLowerCase())
    ).length;
    
    if (blockedTasks > 0) {
      actions.push(`Resolve ${blockedTasks} blocked tasks immediately`);
    }
    
    if (actions.length === 0) {
      actions.push('Continue current pace');
      actions.push('Monitor for potential bottlenecks');
    }

    // Identify critical path
    const criticalPath = tasks
      .filter(task => !['done', 'completed', 'closed'].includes(task.status.toLowerCase()))
      .slice(0, 3)
      .map(task => task.name);

    return {
      completion: estimatedCompletion,
      actions,
      criticalPath
    };
  }

  /**
   * Provide fallback analytics when calculation fails
   */
  private static getFallbackAnalytics(): AnalyticsMetrics {
    return {
      completionRate: 0,
      velocityTrend: 'stable',
      teamEfficiency: 0,
      qualityScore: 0,
      riskLevel: 'medium',
      blockedItemsCount: 0,
      overdueTasks: 0,
      timelineAdherence: 0,
      workloadDistribution: [],
      collaborationScore: 0,
      burndownTrend: [],
      statusDistribution: [],
      priorityBreakdown: [],
      estimatedCompletion: 'Unknown',
      recommendedActions: ['Data unavailable - check platform connection'],
      criticalPath: []
    };
  }
}