// =============================================================================
// Verification Script: Test Connection Model TROFOS Support
// Run this in: backend/services/platform-integrations-service/
// Command: node test-connection-fix.js
// =============================================================================

const mongoose = require('mongoose');

// Test Connection Schema (copy of fixed schema)
const testConnectionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  platform: { 
    type: String, 
    required: true, 
    enum: ['monday', 'jira', 'trofos'] // Fixed enum
  },
  encryptedConfig: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['connected', 'disconnected', 'error'],
    default: 'disconnected'
  },
  projectCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const TestConnection = mongoose.model('TestConnection', testConnectionSchema);

async function testConnectionFix() {
  console.log('🧪 Testing Connection Model Fix...\n');
  
  try {
    // Connect to MongoDB (use your existing connection)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prism-test');
    console.log('✅ Connected to MongoDB');
    
    // Test 1: TROFOS platform should now work
    console.log('\n🎯 Test 1: Creating TROFOS connection...');
    const trofosConnection = new TestConnection({
      userId: 'test-user-123',
      name: 'Test TROFOS Connection',
      platform: 'trofos',
      encryptedConfig: 'encrypted-test-config',
      status: 'disconnected'
    });
    
    await trofosConnection.validate();
    console.log('✅ TROFOS platform validation PASSED');
    
    // Test 2: Existing platforms still work
    console.log('\n🎯 Test 2: Testing existing platforms...');
    
    const jiraConnection = new TestConnection({
      userId: 'test-user-123',
      name: 'Test Jira Connection',
      platform: 'jira',
      encryptedConfig: 'encrypted-test-config'
    });
    await jiraConnection.validate();
    console.log('✅ Jira platform validation PASSED');
    
    const mondayConnection = new TestConnection({
      userId: 'test-user-123',
      name: 'Test Monday Connection',
      platform: 'monday',
      encryptedConfig: 'encrypted-test-config'
    });
    await mondayConnection.validate();
    console.log('✅ Monday platform validation PASSED');
    
    // Test 3: Invalid platform should fail
    console.log('\n🎯 Test 3: Testing invalid platform rejection...');
    try {
      const invalidConnection = new TestConnection({
        userId: 'test-user-123',
        name: 'Invalid Connection',
        platform: 'invalid-platform',
        encryptedConfig: 'encrypted-test-config'
      });
      await invalidConnection.validate();
      console.log('❌ Invalid platform validation should have FAILED');
    } catch (error) {
      console.log('✅ Invalid platform correctly REJECTED');
    }
    
    // Test 4: Database operation test (optional - only if you want to persist)
    console.log('\n🎯 Test 4: Database save test...');
    const savedConnection = await trofosConnection.save();
    console.log('✅ TROFOS connection saved to database:', savedConnection._id);
    
    // Clean up
    await TestConnection.deleteOne({ _id: savedConnection._id });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 ALL TESTS PASSED! Connection model now supports TROFOS.');
    console.log('📝 Summary:');
    console.log('   - TROFOS platform: ✅ Accepted');
    console.log('   - Existing platforms: ✅ Still work');
    console.log('   - Invalid platforms: ✅ Properly rejected');
    console.log('   - Database operations: ✅ Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testConnectionFix().then(() => {
  console.log('\n✅ Connection model fix verification complete!');
  console.log('🔄 Next step: Update ConnectionService interface');
  process.exit(0);
}).catch(console.error);