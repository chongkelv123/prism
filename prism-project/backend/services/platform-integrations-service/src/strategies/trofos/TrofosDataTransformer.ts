// backend/services/platform-integrations-service/src/strategies/trofos/TrofosDataTransformer.ts
// TROFOS DATA TRANSFORMER - Converts TROFOS data to standardized format

import logger from '../../utils/logger';
import {
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

// 📊 VERIFICATION: Export for testing
export const TrofosStatusMappingTester = {
  testStatusMapping: (status: string) => {
    const transformer = new TrofosDataTransformer();
    return (transformer as any).mapTaskStatus(status);
  },

  testCompletionCalculation: (items: TrofosBacklogItem[]) => {
    const transformer = new TrofosDataTransformer();
    return (transformer as any).calculateCompletionRate(items);
  }
};

export class TrofosDataTransformer {

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
      console.log('🚨 TRANSFORMER DEBUG: transformProject() called!', {
        projectId: project.id,
        backlogCount: backlogItems.length,
        sprintCount: sprints.length
      });
      
      logger.info('Transforming TROFOS project with assignee resolution', {
        projectId: project.id,
        backlogItemsCount: backlogItems.length,
        resourcesCount: resources.length,
        sprintsCount: sprints.length
      });

      // Add before the task mapping
      console.log('🔍 DEBUG - First backlog item structure:', {
        id: backlogItems[0]?.id,
        title: backlogItems[0]?.title,
        summary: backlogItems[0]?.summary,
        assignee: backlogItems[0]?.assignee,
        assigneeUser: backlogItems[0]?.assignee?.user,
        userDisplayName: backlogItems[0]?.assignee?.user?.user_display_name
      });

      // Transform sprints first
      const standardizedSprints = sprints.map(sprint => this.transformSprint(sprint, backlogItems));

      // 🔧 FIXED: Transform backlog items with proper assignee resolution
      const standardizedTasks = backlogItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: this.mapTaskStatus(item.status),
        assignee: this.extractAssignee(item),
        priority: this.mapTaskPriority(item.priority),
        type: 'User Story',
        created: item.created_at,
        updated: item.updated_at,
        storyPoints: item.story_points || (item as any).storyPoints, // Handle both field names
        sprint: item.sprint_id ? `Sprint ${item.sprint_id}` : undefined,
        labels: this.extractLabelsFromDescription(item.description)
      }));

      // Transform team members
      const standardizedTeam = this.buildTeamFromBacklogItems(backlogItems);
      // Generate metrics with fixed calculations
      const metrics = this.generateMetrics(project, backlogItems, sprints);

      // Build the standardized project
      const standardizedProject: StandardizedTrofosProject = {
        id: project.id,
        name: project.name,
        description: project.description,
        status: this.mapProjectStatus(project.status),
        platform: 'trofos',
        tasks: standardizedTasks,
        team: standardizedTeam,
        sprints: standardizedSprints,
        metrics,
        platformSpecific: {
          trofos: {
            projectId: project.id,
            backlogCount: backlogItems.length,
            sprintCount: sprints.length,
            apiEndpoint: 'https://trofos-production.comp.nus.edu.sg/api/external' // ✅ Required property

          }
        },
        lastUpdated: project.updated_at || new Date().toISOString(),
        dataQuality: {
          completeness: this.calculateDataCompleteness(backlogItems, resources, sprints),
          accuracy: 95, // High accuracy for real TROFOS data
          freshness: 90  // Good freshness for API data
        }
      };

      // 🔍 DEBUG: Log transformation results
      logger.info('TROFOS project transformation completed', {
        projectId: project.id,
        tasksWithAssignees: standardizedTasks.filter(t => t.assignee !== 'Unassigned').length,
        totalTasks: standardizedTasks.length,
        assigneeResolutionRate: Math.round((standardizedTasks.filter(t => t.assignee !== 'Unassigned').length / standardizedTasks.length) * 100),
        completionRate: metrics.find(m => m.name === 'Completion Rate')?.value
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

  // Add new method:
  private extractAssignee(item: TrofosBacklogItem): string {
    // Check multiple possible assignee field structures
    if (item.assignee) {
      // Structure: { assignee: { user: { user_display_name: "NAME" } } }
      if ((item.assignee as any)?.user?.user_display_name) {
        return (item.assignee as any).user.user_display_name;
      }

      // Structure: { assignee: "NAME" }
      if (typeof item.assignee === 'string') {
        return item.assignee;
      }

      // Structure: { assignee: { name: "NAME" } }
      if ((item.assignee as any)?.name) {
        return (item.assignee as any).name;
      }
    }

    // Check alternative field names
    if ((item as any).assignee_id && resources) {
      return this.resolveAssignee((item as any).assignee_id, resources);
    }

    logger.debug('No assignee found for task', { taskId: item.id, assigneeField: item.assignee });
    return 'Unassigned';
  }

  /**
 * Build team array from unique assignees in backlog items
 */
  private buildTeamFromBacklogItems(backlogItems: TrofosBacklogItem[]): StandardizedTeamMember[] {
    const uniqueAssignees = new Map<string, StandardizedTeamMember>();

    backlogItems.forEach(item => {
      if ((item.assignee as any)?.user?.user_display_name) {
        const userId = (item.assignee as any).user_id?.toString() || (item as any).assignee_id?.toString();
        const displayName = (item.assignee as any).user.user_display_name;

        if (!uniqueAssignees.has(displayName)) {
          uniqueAssignees.set(displayName, {
            id: userId || displayName,
            name: displayName,
            role: 'Team Member',
            email: (item.assignee as any).user.user_email || '',
            taskCount: 0
          });
        }

        // Increment task count
        const member = uniqueAssignees.get(displayName)!;
        member.taskCount = (member.taskCount || 0) + 1;
      }
    });

    return Array.from(uniqueAssignees.values());
  }

  /**
   * 🔧 HELPER: Calculate data completeness score
   */
  private calculateDataCompleteness(
    backlogItems: TrofosBacklogItem[],
    resources: TrofosResource[],
    sprints: TrofosSprint[]
  ): number {
    let completenessScore = 0;
    let totalChecks = 0;

    // Check backlog items completeness
    if (backlogItems.length > 0) {
      const itemsWithTitle = backlogItems.filter(item => !!item.title).length;
      const itemsWithStatus = backlogItems.filter(item => !!item.status).length;
      const itemsWithAssignee = backlogItems.filter(item =>
        !!(item as any).assigneeId || !!(item as any).assignee_id
      ).length;

      completenessScore += (itemsWithTitle / backlogItems.length) * 25;
      completenessScore += (itemsWithStatus / backlogItems.length) * 25;
      completenessScore += (itemsWithAssignee / backlogItems.length) * 25;
      totalChecks += 75;
    }

    // Check team resources completeness
    if (resources.length > 0) {
      const resourcesWithName = resources.filter(r => !!r.name).length;
      completenessScore += (resourcesWithName / resources.length) * 25;
      totalChecks += 25;
    }

    return totalChecks > 0 ? Math.round(completenessScore) : 0;
  }

  /**
 * 🔧 NEW: TROFOS-specific assignee resolution
 * Bug Fix: Resolve assigneeId to actual team member name
 */
  private resolveAssignee(assigneeId: number | string | undefined, teamMembers: TrofosResource[]): string {
    if (!assigneeId) return 'Unassigned';

    // Convert to number if it's a string
    const numericAssigneeId = typeof assigneeId === 'string' ? parseInt(assigneeId, 10) : assigneeId;

    if (isNaN(numericAssigneeId)) return 'Unassigned';

    // Find team member by ID
    const assignedMember = teamMembers.find(member => {
      // Handle different possible ID field names
      const memberId = member.id || (member as any).userId || (member as any).resourceId;
      const numericMemberId = typeof memberId === 'string' ? parseInt(memberId, 10) : memberId;
      return numericMemberId === numericAssigneeId;
    });

    if (assignedMember) {
      // Return the member's name
      const memberName = assignedMember.name || (assignedMember as any).username || (assignedMember as any).displayName;

      // 🔍 DEBUG: Log successful assignee resolution
      logger.debug('TROFOS assignee resolved', {
        assigneeId: numericAssigneeId,
        resolvedName: memberName,
        availableMembers: teamMembers.length
      });

      return memberName || 'Unassigned';
    }

    // 🔍 DEBUG: Log failed assignee resolution for debugging
    logger.warn('TROFOS assignee not found', {
      assigneeId: numericAssigneeId,
      availableMembers: teamMembers.map(m => ({
        id: m.id,
        name: m.name
      }))
    });

    return 'Unassigned';
  }

  /**
   * 🔧 UPDATED: Transform backlog items with fixed assignee resolution   
   */
  transformBacklogItems(items: TrofosBacklogItem[]): StandardizedTask[] {
    return items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: this.mapTaskStatus(item.status), // 🔧 Uses fixed status mapping
      assignee: item.assignee || 'Unassigned', // Will be fixed in Step 2B
      priority: this.mapTaskPriority(item.priority),
      type: 'User Story',
      created: item.created_at,
      updated: item.updated_at,
      storyPoints: item.story_points || (item as any).storyPoints, // 🔧 Handle both field names
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

  /**
   * 🔧 FIXED: TROFOS-specific completion rate calculation
   * Bug Fix: Properly identify completed items using TROFOS status values
   */
  private calculateCompletionRate(backlogItems: TrofosBacklogItem[]): number {
    if (backlogItems.length === 0) return 0;

    const completedItems = backlogItems.filter(item => {
      if (!item.status) return false;

      const normalizedStatus = item.status.toString().toUpperCase();

      // 🔧 FIX: TROFOS-specific completion check
      // Match exactly what TROFOS API returns as completed statuses
      return normalizedStatus === 'DONE' ||
        normalizedStatus === 'COMPLETED' ||
        normalizedStatus === 'FINISHED';
    }).length;

    const completionRate = Math.round((completedItems / backlogItems.length) * 100);

    // 🔍 DEBUG: Log completion calculation for verification
    logger.info('TROFOS completion rate calculated', {
      totalItems: backlogItems.length,
      completedItems,
      completionRate: `${completionRate}%`,
      sampleStatuses: backlogItems.slice(0, 5).map(item => item.status)
    });

    return completionRate;
  }

  /**
   * 🔧 UPDATED: Generate metrics with fixed completion rate calculation
   */
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

    // Status distribution with fixed mapping
    const statusCounts = this.countByField(backlogItems, 'status');
    Object.entries(statusCounts).forEach(([status, count]) => {
      metrics.push({
        name: `${this.mapTaskStatus(status)} Tasks`,
        value: count,
        type: 'number',
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

    // 🔧 FIXED: Story points analysis with proper field name handling
    const totalStoryPoints = backlogItems.reduce((sum, item) => {
      // Handle both 'storyPoints' and 'story_points' field names
      const points = item.story_points || (item as any).storyPoints || 0;
      return sum + points;
    }, 0);

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

    // 🔧 FIXED: Completion rate with proper TROFOS status matching
    const completionRate = this.calculateCompletionRate(backlogItems);
    metrics.push({
      name: 'Completion Rate',
      value: `${completionRate}%`,
      type: 'percentage',
      category: 'progress'
    });

    logger.info('TROFOS metrics generated', {
      metricsCount: metrics.length,
      completionRate: `${completionRate}%`,
      storyPoints: totalStoryPoints,
      backlogItemsCount: backlogItems.length
    });

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

  /**
     * 🔧 FIXED: TROFOS-specific status mapping with proper completion calculation
     * Bug Fix: Handle TROFOS uppercase status values correctly
     */
  private mapTaskStatus(status: string): string {
    if (!status) return 'To Do';

    const normalizedStatus = status.toString().toUpperCase();

    // 🔧 FIX: TROFOS-specific status mapping
    // TROFOS uses uppercase status values like 'DONE', 'COMPLETED', 'IN_PROGRESS'
    switch (normalizedStatus) {
      case 'DONE':
      case 'COMPLETED':
      case 'FINISHED':
        return 'Done';

      case 'IN_PROGRESS':
      case 'DOING':
      case 'ACTIVE':
      case 'WORKING':
        return 'In Progress';

      case 'REVIEW':
      case 'TESTING':
      case 'QA':
        return 'In Review';

      case 'TODO':
      case 'BACKLOG':
      case 'NEW':
      case 'OPEN':
        return 'To Do';

      default:
        // For any unmapped status, return as-is but log for monitoring
        logger.debug('TROFOS: Unmapped status encountered', {
          originalStatus: status,
          normalizedStatus
        });
        return status;
    }
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