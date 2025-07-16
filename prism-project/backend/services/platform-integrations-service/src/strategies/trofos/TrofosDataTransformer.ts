// backend/services/platform-integrations-service/src/strategies/trofos/TrofosDataTransformer.ts
// TROFOS DATA TRANSFORMER - Converts TROFOS data to standardized format

import logger from '../../utils/logger';
import {
  ITrofosDataTransformer,
  TrofosProject,
  TrofosBacklogItem,
  TrofosSprint,
  TrofosResource,
  StandardizedTrofosProject,
  StandardizedTask,
  StandardizedTeamMember,
  StandardizedMetric,
  StandardizedSprint
} from '../../interfaces/ITrofosStrategy';

export class TrofosDataTransformer implements ITrofosDataTransformer {

  constructor() {
    logger.info('TrofosDataTransformer initialized');
  }

  transformProject(
    project: TrofosProject,
    backlogItems: TrofosBacklogItem[],
    sprints: TrofosSprint[],
    resources: TrofosResource[]
  ): StandardizedTrofosProject {
    try {
      logger.info('Transforming TROFOS project to standardized format', {
        projectId: project.id,
        projectName: project.name,
        backlogItemsCount: backlogItems.length,
        sprintsCount: sprints.length,
        resourcesCount: resources.length
      });

      const standardizedTasks = this.transformBacklogItems(backlogItems);
      const standardizedTeam = this.transformResources(resources);
      const standardizedMetrics = this.generateMetrics(project, backlogItems, sprints);
      const standardizedSprints = sprints.map(sprint => this.transformSprint(sprint, backlogItems));

      const standardizedProject: StandardizedTrofosProject = {
        id: project.id,
        name: project.name,
        platform: 'trofos',
        description: project.description || `TROFOS project: ${project.name}`,
        status: this.mapProjectStatus(project.status),
        tasks: standardizedTasks,
        team: standardizedTeam,
        metrics: standardizedMetrics,
        sprints: standardizedSprints,
        platformSpecific: {
          trofos: {
            projectId: project.id,
            backlogCount: project.backlog_count,
            sprintCount: project.sprint_count,
            apiEndpoint: `/api/external/v1/project/${project.id}`
          }
        },
        lastUpdated: project.updated_at || new Date().toISOString(),
        dataQuality: this.calculateDataQuality(project, backlogItems, sprints, resources)
      };

      logger.info('TROFOS project transformation completed', {
        projectId: standardizedProject.id,
        tasksTransformed: standardizedProject.tasks.length,
        teamMembersTransformed: standardizedProject.team.length,
        metricsGenerated: standardizedProject.metrics.length,
        sprintsTransformed: standardizedProject.sprints?.length || 0
      });

      return standardizedProject;

    } catch (error) {
      logger.error('Failed to transform TROFOS project', {
        projectId: project.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  transformBacklogItems(items: TrofosBacklogItem[]): StandardizedTask[] {
    return items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: this.mapTaskStatus(item.status),
      assignee: item.assignee || 'Unassigned',
      priority: this.mapTaskPriority(item.priority),
      type: 'User Story',
      created: item.created_at,
      updated: item.updated_at,
      storyPoints: item.story_points,
      sprint: item.sprint_id ? `Sprint ${item.sprint_id}` : undefined,
      labels: this.extractLabelsFromDescription(item.description)
    }));
  }

  transformResources(resources: TrofosResource[]): StandardizedTeamMember[] {
    const resourceMap = new Map<string, StandardizedTeamMember>();

    resources.forEach(resource => {
      const existingMember = resourceMap.get(resource.email || resource.name);
      
      if (existingMember) {
        existingMember.taskCount = (existingMember.taskCount || 0) + 1;
      } else {
        resourceMap.set(resource.email || resource.name, {
          id: resource.id,
          name: resource.name,
          role: this.mapResourceRole(resource.role),
          email: resource.email,
          taskCount: 1,
          allocation: resource.allocation
        });
      }
    });

    return Array.from(resourceMap.values());
  }

  generateMetrics(
    project: TrofosProject,
    backlogItems: TrofosBacklogItem[],
    sprints: TrofosSprint[]
  ): StandardizedMetric[] {
    const metrics: StandardizedMetric[] = [];

    // Basic project metrics
    metrics.push(
      {
        name: 'Total Backlog Items',
        value: backlogItems.length,
        type: 'number',
        category: 'overview'
      },
      {
        name: 'Total Sprints',
        value: sprints.length,
        type: 'number',
        category: 'overview'
      },
      {
        name: 'Project Status',
        value: this.mapProjectStatus(project.status),
        type: 'text',
        category: 'info'
      }
    );

    // Status distribution
    const statusCounts = this.countByField(backlogItems, 'status');
    Object.entries(statusCounts).forEach(([status, count]) => {
      metrics.push({
        name: this.mapTaskStatus(status),
        value: count,
        type: 'status',
        category: 'status'
      });
    });

    // Priority distribution
    const priorityCounts = this.countByField(backlogItems, 'priority');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      metrics.push({
        name: `${this.mapTaskPriority(priority)} Priority`,
        value: count,
        type: 'priority',
        category: 'priority'
      });
    });

    // Story points analysis
    const totalStoryPoints = backlogItems.reduce((sum, item) => sum + (item.story_points || 0), 0);
    if (totalStoryPoints > 0) {
      metrics.push({
        name: 'Total Story Points',
        value: totalStoryPoints,
        type: 'number',
        category: 'effort'
      });
    }

    // Sprint velocity (if sprints have completed items)
    const completedSprints = sprints.filter(sprint => sprint.status === 'COMPLETED');
    if (completedSprints.length > 0 && completedSprints.some(s => s.velocity)) {
      const avgVelocity = completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length;
      metrics.push({
        name: 'Average Velocity',
        value: Math.round(avgVelocity * 10) / 10,
        type: 'number',
        category: 'performance'
      });
    }

    // Completion rate
    const completedItems = backlogItems.filter(item => 
      item.status.toLowerCase().includes('done') || 
      item.status.toLowerCase().includes('completed')
    ).length;
    
    if (backlogItems.length > 0) {
      const completionRate = Math.round((completedItems / backlogItems.length) * 100);
      metrics.push({
        name: 'Completion Rate',
        value: `${completionRate}%`,
        type: 'percentage',
        category: 'progress'
      });
    }

    return metrics;
  }

  private transformSprint(sprint: TrofosSprint, allBacklogItems: TrofosBacklogItem[]): StandardizedSprint {
    const sprintItems = allBacklogItems.filter(item => item.sprint_id === sprint.id);
    const standardizedItems = this.transformBacklogItems(sprintItems);

    const plannedPoints = sprintItems.reduce((sum, item) => sum + (item.story_points || 0), 0);
    const completedItems = sprintItems.filter(item => 
      item.status.toLowerCase().includes('done') || 
      item.status.toLowerCase().includes('completed')
    );
    const completedPoints = completedItems.reduce((sum, item) => sum + (item.story_points || 0), 0);

    return {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      status: this.mapSprintStatus(sprint.status),
      velocity: sprint.velocity,
      plannedPoints,
      completedPoints,
      items: standardizedItems
    };
  }

  private mapProjectStatus(status: string): string {
    if (!status) return 'active';
    
    const s = status.toLowerCase();
    if (s.includes('private')) return 'private';
    if (s.includes('public')) return 'public';
    if (s.includes('archived')) return 'archived';
    if (s.includes('completed')) return 'completed';
    return 'active';
  }

  private mapTaskStatus(status: string): string {
    if (!status) return 'To Do';
    
    const s = status.toLowerCase();
    if (s.includes('todo') || s.includes('new') || s.includes('open')) return 'To Do';
    if (s.includes('progress') || s.includes('working') || s.includes('active')) return 'In Progress';
    if (s.includes('review') || s.includes('testing')) return 'In Review';
    if (s.includes('done') || s.includes('completed') || s.includes('closed')) return 'Done';
    if (s.includes('blocked') || s.includes('stuck')) return 'Blocked';
    
    // Return the original status if no mapping found
    return status;
  }

  private mapTaskPriority(priority: string): string {
    if (!priority) return 'Medium';
    
    const p = priority.toString().toUpperCase();
    if (p.includes('HIGH') || p.includes('URGENT') || p.includes('CRITICAL')) return 'High';
    if (p.includes('LOW') || p.includes('MINOR')) return 'Low';
    return 'Medium';
  }

  private mapSprintStatus(status: string): string {
    if (!status) return 'Planning';
    
    const s = status.toString().toUpperCase();
    if (s.includes('ACTIVE') || s.includes('CURRENT') || s.includes('RUNNING')) return 'Active';
    if (s.includes('COMPLETED') || s.includes('DONE') || s.includes('FINISHED')) return 'Completed';
    return 'Planning';
  }

  private mapResourceRole(role: string): string {
    if (!role) return 'Team Member';
    
    const r = role.toLowerCase();
    if (r.includes('manager') || r.includes('lead')) return 'Project Manager';
    if (r.includes('developer') || r.includes('engineer')) return 'Developer';
    if (r.includes('designer')) return 'Designer';
    if (r.includes('tester') || r.includes('qa')) return 'QA Engineer';
    if (r.includes('analyst')) return 'Business Analyst';
    if (r.includes('owner') || r.includes('product')) return 'Product Owner';
    if (r.includes('scrum') || r.includes('master')) return 'Scrum Master';
    
    return role; // Return original if no mapping found
  }

  private extractLabelsFromDescription(description?: string): string[] {
    if (!description) return [];
    
    // Extract hashtags and common label patterns
    const labels: string[] = [];
    
    // Extract hashtags
    const hashtagMatches = description.match(/#\w+/g);
    if (hashtagMatches) {
      labels.push(...hashtagMatches.map(tag => tag.substring(1)));
    }
    
    // Extract [labels] in brackets
    const bracketMatches = description.match(/\[([^\]]+)\]/g);
    if (bracketMatches) {
      labels.push(...bracketMatches.map(match => match.slice(1, -1)));
    }
    
    return labels.filter(label => label.length > 0);
  }

  private countByField(items: any[], field: string): Record<string, number> {
    const counts: Record<string, number> = {};
    
    items.forEach(item => {
      const value = item[field] || 'Unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    
    return counts;
  }

  private calculateDataQuality(
    project: TrofosProject,
    backlogItems: TrofosBacklogItem[],
    sprints: TrofosSprint[],
    resources: TrofosResource[]
  ): { completeness: number; accuracy: number; freshness: number } {
    // Completeness: How much data is available
    let completenessScore = 0;
    let completenessChecks = 0;

    // Project completeness
    completenessChecks += 3;
    if (project.name && project.name.trim().length > 0) completenessScore += 1;
    if (project.description && project.description.trim().length > 0) completenessScore += 1;
    if (project.created_at) completenessScore += 1;

    // Backlog completeness
    if (backlogItems.length > 0) {
      completenessChecks += 3;
      const itemsWithDescription = backlogItems.filter(item => item.description).length;
      const itemsWithAssignee = backlogItems.filter(item => item.assignee).length;
      const itemsWithStoryPoints = backlogItems.filter(item => item.story_points).length;
      
      if (itemsWithDescription / backlogItems.length > 0.5) completenessScore += 1;
      if (itemsWithAssignee / backlogItems.length > 0.3) completenessScore += 1;
      if (itemsWithStoryPoints / backlogItems.length > 0.3) completenessScore += 1;
    }

    // Sprint completeness
    if (sprints.length > 0) {
      completenessChecks += 2;
      const sprintsWithGoal = sprints.filter(sprint => sprint.goal).length;
      const sprintsWithVelocity = sprints.filter(sprint => sprint.velocity).length;
      
      if (sprintsWithGoal / sprints.length > 0.3) completenessScore += 1;
      if (sprintsWithVelocity / sprints.length > 0.3) completenessScore += 1;
    }

    const completeness = completenessChecks > 0 ? Math.round((completenessScore / completenessChecks) * 100) : 50;

    // Accuracy: Assume high accuracy since data comes directly from TROFOS API
    const accuracy = 95;

    // Freshness: Based on last update time
    const lastUpdate = new Date(project.updated_at || project.created_at);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    let freshness: number;
    if (daysSinceUpdate < 1) freshness = 100;
    else if (daysSinceUpdate < 7) freshness = 90;
    else if (daysSinceUpdate < 30) freshness = 80;
    else if (daysSinceUpdate < 90) freshness = 70;
    else freshness = 60;

    return { completeness, accuracy, freshness };
  }
}