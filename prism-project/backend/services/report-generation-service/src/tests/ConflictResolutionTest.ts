// backend/services/report-generation-service/src/tests/ConflictResolutionTest.ts
// VERIFICATION TEST - Ensure conflicting classes are resolved

import { EnhancedJiraReportGenerator } from '../generators/EnhancedJiraReportGenerator';
import { TemplateReportGenerator, EnhancedMondayReportGenerator, TrofosReportGenerator } from '../generators/TemplateReportGenerator';
import { ProjectData } from '../services/PlatformDataService';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class ConflictResolutionTest {
  private results: TestResult[] = [];

  /**
   * Run all verification tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Conflict Resolution Verification Tests...\n');

    // Test 1: Verify no import conflicts
    await this.testImportResolution();

    // Test 2: Verify class instantiation works
    await this.testClassInstantiation();

    // Test 3: Verify Jira generator works correctly
    await this.testJiraGeneratorFunctionality();

    // Test 4: Verify template system still works
    await this.testTemplateSystemFunctionality();

    // Test 5: Verify different projects generate different reports
    await this.testDataIsolation();

    // Print results
    this.printResults();
  }

  /**
   * Test 1: Verify no import conflicts exist
   */
  private async testImportResolution(): Promise<void> {
    try {
      // Try importing and check for conflicts
      const jiraGenerator = EnhancedJiraReportGenerator;
      const templateGenerator = TemplateReportGenerator;
      const mondayGenerator = EnhancedMondayReportGenerator;
      const trofosGenerator = TrofosReportGenerator;

      // Verify they're different constructors
      const jiraInstance = new jiraGenerator();
      const templateInstance = new templateGenerator();
      const mondayInstance = new mondayGenerator();
      const trofosInstance = new trofosGenerator();

      // Check constructor names
      const constructorNames = {
        jira: jiraInstance.constructor.name,
        template: templateInstance.constructor.name,
        monday: mondayInstance.constructor.name,
        trofos: trofosInstance.constructor.name
      };

      // Verify no duplicate constructor names (except intended ones)
      const isJiraUnique = constructorNames.jira === 'EnhancedJiraReportGenerator';
      const isTemplateUnique = constructorNames.template === 'TemplateReportGenerator';
      const isMondayUnique = constructorNames.monday === 'EnhancedMondayReportGenerator';
      const isTrofosUnique = constructorNames.trofos === 'TrofosReportGenerator';

      this.results.push({
        testName: 'Import Resolution',
        passed: isJiraUnique && isTemplateUnique && isMondayUnique && isTrofosUnique,
        details: {
          constructorNames,
          uniqueClasses: { isJiraUnique, isTemplateUnique, isMondayUnique, isTrofosUnique }
        }
      });

    } catch (error) {
      this.results.push({
        testName: 'Import Resolution',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown import error'
      });
    }
  }

  /**
   * Test 2: Verify class instantiation works without conflicts
   */
  private async testClassInstantiation(): Promise<void> {
    try {
      // Create instances of each generator
      const jiraGenerator = new EnhancedJiraReportGenerator();
      const templateGenerator = new TemplateReportGenerator();
      const mondayGenerator = new EnhancedMondayReportGenerator();
      const trofosGenerator = new TrofosReportGenerator();

      // Verify each has expected methods
      const jiraHasGenerate = typeof jiraGenerator.generate === 'function';
      const templateHasGenerate = typeof templateGenerator.generate === 'function';
      const mondayHasGenerate = typeof mondayGenerator.generate === 'function';
      const trofosHasGenerate = typeof trofosGenerator.generate === 'function';

      const allHaveGenerate = jiraHasGenerate && templateHasGenerate && mondayHasGenerate && trofosHasGenerate;

      this.results.push({
        testName: 'Class Instantiation',
        passed: allHaveGenerate,
        details: {
          methodsExist: {
            jiraHasGenerate,
            templateHasGenerate,
            mondayHasGenerate,
            trofosHasGenerate
          }
        }
      });

    } catch (error) {
      this.results.push({
        testName: 'Class Instantiation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown instantiation error'
      });
    }
  }

  /**
   * Test 3: Test Jira generator functionality (the main issue)
   */
  private async testJiraGeneratorFunctionality(): Promise<void> {
    try {
      const jiraGenerator = new EnhancedJiraReportGenerator();
      
      // Create mock Jira project data
      const mockJiraProject: ProjectData = {
        id: 'TEST-PROJECT',
        name: 'Test JIRA Project',
        platform: 'jira',
        tasks: [
          {
            id: 'TEST-1',
            name: 'Test Task 1',
            status: 'In Progress',
            assignee: 'John Doe',
            priority: 'High'
          },
          {
            id: 'TEST-2', 
            name: 'Test Task 2',
            status: 'Done',
            assignee: 'Jane Smith',
            priority: 'Medium'
          }
        ],
        metrics: [
          { name: 'Total Tasks', value: 2 },
          { name: 'Completion Rate', value: '50%' }
        ],
        fallbackData: false
      };

      const config = {
        templateId: 'standard' as const,
        title: 'Test Jira Report',
        includeTeamAnalysis: true,
        includeRiskAssessment: true,
        includePriorityBreakdown: true
      };

      console.log('   🔍 Testing Jira generator...');
      
      // Test the generate method - this should NOT throw "pptx.addSlide is not a function"
      const startTime = Date.now();
      
      try {
        // Use a shorter timeout for testing
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Test timeout after 10 seconds')), 10000);
        });

        const generatePromise = jiraGenerator.generate(mockJiraProject, config);
        
        const filename = await Promise.race([generatePromise, timeoutPromise]) as string;
        const endTime = Date.now();
        
        // Verify filename was returned
        const hasValidFilename = typeof filename === 'string' && filename.length > 0;
        
        this.results.push({
          testName: 'Jira Generator Functionality',
          passed: hasValidFilename,
          details: {
            filename,
            executionTime: `${endTime - startTime}ms`,
            configUsed: config,
            taskCount: mockJiraProject.tasks.length
          }
        });

      } catch (generateError) {
        // Check if it's the specific error we were trying to fix
        const errorMessage = generateError instanceof Error ? generateError.message : 'Unknown error';
        const isAddSlideError = errorMessage.includes('addSlide is not a function');
        
        this.results.push({
          testName: 'Jira Generator Functionality',
          passed: false,
          error: errorMessage,
          details: {
            isOriginalBug: isAddSlideError,
            executionTime: `${Date.now() - startTime}ms`,
            errorType: generateError instanceof Error ? generateError.name : 'Unknown'
          }
        });
      }

    } catch (error) {
      this.results.push({
        testName: 'Jira Generator Functionality',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown setup error'
      });
    }
  }

  /**
   * Test 4: Verify template system still works for Monday/TROFOS
   */
  private async testTemplateSystemFunctionality(): Promise<void> {
    try {
      const mondayGenerator = new EnhancedMondayReportGenerator();

      // Create mock Monday project data
      const mockMondayProject: ProjectData = {
        id: 'MONDAY-TEST',
        name: 'Test Monday Project',
        platform: 'monday',
        tasks: [
          {
            name: 'Monday Task 1',
            status: 'Working on it',
            assignee: 'Alice Johnson',
            priority: 'High',
            group: 'Development'
          }
        ],
        metrics: [
          { name: 'Board Items', value: 1 }
        ],
        fallbackData: false
      };

      const config = {
        templateId: 'standard' as const,
        title: 'Test Monday Report'
      };

      console.log('   🔍 Testing template system...');

      // Test Monday generator (uses template system)
      // This should work through the template delegation
      const mondayResult = await Promise.race([
        mondayGenerator.generate(mockMondayProject, config),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Template test timeout')), 5000))
      ]);

      const templateSystemWorks = typeof mondayResult === 'string';

      this.results.push({
        testName: 'Template System Functionality',
        passed: templateSystemWorks,
        details: {
          mondayResult: templateSystemWorks ? 'Generated successfully' : 'Failed',
          platform: mockMondayProject.platform
        }
      });

    } catch (error) {
      this.results.push({
        testName: 'Template System Functionality',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown template error'
      });
    }
  }

  /**
   * Test 5: Verify data isolation (original fix verification)
   */
  private async testDataIsolation(): Promise<void> {
    try {
      const jiraGenerator = new EnhancedJiraReportGenerator();

      // Create two different projects
      const prismProject: ProjectData = {
        id: 'PRISM',
        name: 'PRISM Development Project',
        platform: 'jira',
        tasks: Array.from({ length: 25 }, (_, i) => ({
          id: `PRISM-${i + 1}`,
          name: `PRISM Task ${i + 1}`,
          status: 'In Progress',
          assignee: 'Developer'
        })),
        metrics: [{ name: 'Total Tasks', value: 25 }],
        fallbackData: false
      };

      const learnJiraProject: ProjectData = {
        id: 'LEARNJIRA',
        name: 'Learn Jira in 10 minutes 👋',
        platform: 'jira',
        tasks: Array.from({ length: 5 }, (_, i) => ({
          id: `LEARN-${i + 1}`,
          name: `Learn Task ${i + 1}`,
          status: 'To Do',
          assignee: 'Learner'
        })),
        metrics: [{ name: 'Total Tasks', value: 5 }],
        fallbackData: false
      };

      const config = {
        templateId: 'standard' as const,
        title: 'Data Isolation Test'
      };

      console.log('   🔍 Testing data isolation...');

      // Generate reports for both projects
      const prismReport = await jiraGenerator.generate(prismProject, { ...config, title: 'PRISM Report' });
      const learnReport = await jiraGenerator.generate(learnJiraProject, { ...config, title: 'Learn Jira Report' });

      // Verify different filenames (indicating different reports)
      const hasDifferentFilenames = prismReport !== learnReport;
      const bothHaveFilenames = typeof prismReport === 'string' && typeof learnReport === 'string';

      this.results.push({
        testName: 'Data Isolation',
        passed: hasDifferentFilenames && bothHaveFilenames,
        details: {
          prismProject: {
            id: prismProject.id,
            taskCount: prismProject.tasks.length,
            filename: prismReport
          },
          learnJiraProject: {
            id: learnJiraProject.id,
            taskCount: learnJiraProject.tasks.length,
            filename: learnReport
          },
          isolationWorking: hasDifferentFilenames
        }
      });

    } catch (error) {
      this.results.push({
        testName: 'Data Isolation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown isolation error'
      });
    }
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n🧪 CONFLICT RESOLUTION TEST RESULTS');
    console.log('=====================================\n');

    let passedCount = 0;
    let totalCount = this.results.length;

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const number = (index + 1).toString().padStart(2, '0');
      
      console.log(`${number}. ${status} | ${result.testName}`);
      
      if (result.passed) {
        passedCount++;
        if (result.details) {
          console.log(`     📊 Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n     ')}`);
        }
      } else {
        console.log(`     ❌ Error: ${result.error}`);
        if (result.details) {
          console.log(`     📊 Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n     ')}`);
        }
      }
      console.log('');
    });

    // Summary
    console.log('=====================================');
    console.log(`📊 SUMMARY: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED! Conflict resolution successful.');
      console.log('✅ The "pptx.addSlide is not a function" error should be resolved.');
      console.log('✅ Data bleeding between projects remains fixed.');
      console.log('✅ Architecture conflicts have been eliminated.');
    } else {
      console.log('⚠️  Some tests failed. Review the errors above.');
    }
  }
}

// Export for use in test runner
export { ConflictResolutionTest };

// Self-executing test when run directly
if (require.main === module) {
  const test = new ConflictResolutionTest();
  test.runAllTests()
    .catch(error => {
      console.error('🚨 Test runner failed:', error);
      process.exit(1);
    });
}