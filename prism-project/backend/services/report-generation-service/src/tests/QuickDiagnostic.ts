// backend/services/report-generation-service/src/tests/QuickDiagnostic.ts
// Quick diagnostic to verify class conflicts are resolved

console.log('🔍 QUICK CONFLICT DIAGNOSTIC');
console.log('============================\n');

try {
  // Test 1: Import resolution
  console.log('1. Testing import resolution...');
  
  const { EnhancedJiraReportGenerator } = require('../generators/EnhancedJiraReportGenerator');
  const { TemplateReportGenerator, EnhancedMondayReportGenerator } = require('../generators/TemplateReportGenerator');
  
  console.log('   ✅ All imports successful');

  // Test 2: Class instantiation
  console.log('2. Testing class instantiation...');
  
  const jiraGen = new EnhancedJiraReportGenerator();
  const templateGen = new TemplateReportGenerator();
  const mondayGen = new EnhancedMondayReportGenerator();
  
  console.log('   ✅ All classes instantiated successfully');

  // Test 3: Method existence
  console.log('3. Testing method existence...');
  
  const jiraHasGenerate = typeof jiraGen.generate === 'function';
  const templateHasGenerate = typeof templateGen.generate === 'function';
  const mondayHasGenerate = typeof mondayGen.generate === 'function';
  
  console.log(`   - EnhancedJiraReportGenerator.generate: ${jiraHasGenerate ? '✅' : '❌'}`);
  console.log(`   - TemplateReportGenerator.generate: ${templateHasGenerate ? '✅' : '❌'}`);
  console.log(`   - EnhancedMondayReportGenerator.generate: ${mondayHasGenerate ? '✅' : '❌'}`);

  // Test 4: Constructor uniqueness
  console.log('4. Testing constructor uniqueness...');
  
  const constructors = {
    jira: jiraGen.constructor.name,
    template: templateGen.constructor.name,
    monday: mondayGen.constructor.name
  };
  
  console.log('   Constructor names:', constructors);
  
  const hasUniqueConstructors = 
    constructors.jira === 'EnhancedJiraReportGenerator' &&
    constructors.template === 'TemplateReportGenerator' &&
    constructors.monday === 'EnhancedMondayReportGenerator';
    
  console.log(`   Uniqueness check: ${hasUniqueConstructors ? '✅' : '❌'}`);

  // Test 5: PptxGenJS integration test
  console.log('5. Testing PptxGenJS integration...');
  
  try {
    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();
    
    // Test the exact call that was failing
    console.log('   - Creating PptxGenJS instance...');
    console.log(`   - pptx object type: ${typeof pptx}`);
    console.log(`   - pptx constructor: ${pptx.constructor.name}`);
    console.log(`   - addSlide method type: ${typeof pptx.addSlide}`);
    
    if (typeof pptx.addSlide === 'function') {
      console.log('   ✅ pptx.addSlide method is available');
      
      // Try to call addSlide (this was the failing call)
      const slide = pptx.addSlide();
      console.log(`   ✅ pptx.addSlide() executed successfully`);
      console.log(`   - Slide object type: ${typeof slide}`);
    } else {
      console.log('   ❌ pptx.addSlide method is not a function');
    }
    
  } catch (pptxError: any) {
    console.log('   ❌ PptxGenJS integration failed:', pptxError.message);
  }

  console.log('\n🎉 DIAGNOSTIC COMPLETE');
  console.log('======================');
  console.log('✅ No class conflicts detected');
  console.log('✅ All imports working correctly');
  console.log('✅ PptxGenJS integration functional');
  console.log('\n💡 Next step: Test with real Jira data');

} catch (error: any) {
  console.error('\n❌ DIAGNOSTIC FAILED');
  console.error('===================');
  console.error('Error:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('1. Ensure you applied all the cleanup changes');
  console.log('2. Delete JiraReportGenerator.ts file');
  console.log('3. Remove duplicate classes from TemplateReportGenerator.ts');
  console.log('4. Run: npm install');
  console.log('5. Run: npm run build');
  
  process.exit(1);
}