#!/usr/bin/env node
const path = require('path');
const childProcess = require('child_process');
const spawn = childProcess.spawn;

console.log('🧪 PRISM Conflict Resolution Test Runner');
console.log('========================================\n');

const serviceDir = __dirname;
process.chdir(serviceDir);

console.log('📁 Working directory:', process.cwd());
console.log('🔧 Compiling TypeScript...\n');

const tscCompile = spawn('npx', ['tsc', '--noEmit'], {
  stdio: 'inherit',
  shell: true
});

tscCompile.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ TypeScript compilation failed');
    process.exit(1);
  }

  console.log('✅ TypeScript compilation successful\n');
  console.log('🔬 Running conflict resolution tests...\n');

  const testRunner = spawn('npx', ['ts-node', 'src/tests/ConflictResolutionTest.ts'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  testRunner.on('close', (testCode) => {
    if (testCode === 0) {
      console.log('\n🎉 All conflict resolution tests completed successfully!');
    } else {
      console.log('\n❌ Some tests failed. Please review the output above.');
      process.exit(1);
    }
  });
});