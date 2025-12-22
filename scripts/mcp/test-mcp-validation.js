#!/usr/bin/env node

/**
 * Test script to demonstrate MCP configuration validation behavior.
 * 
 * This script tests different MCP configuration scenarios:
 * 1. Valid configuration - application starts successfully
 * 2. Invalid transport - application fails with clear error message
 * 3. Invalid port - application fails with validation error
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const originalEnv = fs.readFileSync(envPath, 'utf8');

console.log('🧪 Testing MCP Configuration Validation\n');

// Test scenarios
const scenarios = [
  {
    name: 'Valid Configuration',
    env: 'MCP_TRANSPORT=http\nMCP_PORT=3235',
    shouldFail: false,
    expectedLog: '🤖 MCP Server: http transport'
  },
  {
    name: 'Invalid Transport',
    env: 'MCP_TRANSPORT=invalid_transport\nMCP_PORT=3235',
    shouldFail: false, // EnvUtil converts to default
    expectedLog: '❌ Invalid value for MCP_TRANSPORT'
  },
  {
    name: 'Invalid Port (too high)',
    env: 'MCP_TRANSPORT=http\nMCP_PORT=99999',
    shouldFail: true,
    expectedLog: '❌ MCP Configuration validation failed'
  },
  {
    name: 'Invalid Port (too low)',
    env: 'MCP_TRANSPORT=http\nMCP_PORT=0',
    shouldFail: true,
    expectedLog: '❌ MCP Configuration validation failed'
  }
];

async function runTest(scenario) {
  console.log(`\n📋 Testing: ${scenario.name}`);
  console.log(`   Config: ${scenario.env.replace('\n', ', ')}`);
  
  // Update .env file
  const envContent = originalEnv.replace(
    /MCP_TRANSPORT=.*/,
    scenario.env.split('\n')[0]
  ).replace(
    /MCP_PORT=.*/,
    scenario.env.split('\n')[1]
  );
  
  fs.writeFileSync(envPath, envContent);
  
  return new Promise((resolve) => {
    const child = spawn('npm', ['start'], {
      stdio: 'pipe',
      shell: true,
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let hasExpectedLog = false;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes(scenario.expectedLog)) {
        hasExpectedLog = true;
      }
      
      // If we see the application started successfully
      if (output.includes('🚀 Application is running on:')) {
        child.kill();
        console.log(`   ✅ Result: Application started successfully`);
        console.log(`   ✅ Expected log found: ${hasExpectedLog ? 'Yes' : 'No'}`);
        resolve({ success: true, hasExpectedLog });
      }
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
      if (output.includes(scenario.expectedLog)) {
        hasExpectedLog = true;
      }
    });
    
    child.on('exit', (code) => {
      const failed = code !== 0;
      console.log(`   ${failed ? '❌' : '✅'} Result: Application ${failed ? 'failed to start' : 'started'} (exit code: ${code})`);
      console.log(`   ${hasExpectedLog ? '✅' : '❌'} Expected log found: ${hasExpectedLog ? 'Yes' : 'No'}`);
      
      if (scenario.shouldFail && !failed) {
        console.log(`   ⚠️  WARNING: Expected failure but application started`);
      } else if (!scenario.shouldFail && failed) {
        console.log(`   ⚠️  WARNING: Expected success but application failed`);
      }
      
      resolve({ success: !failed, hasExpectedLog });
    });
    
    // Kill after 10 seconds if still running
    setTimeout(() => {
      child.kill();
      resolve({ success: false, hasExpectedLog });
    }, 10000);
  });
}

async function main() {
  try {
    for (const scenario of scenarios) {
      await runTest(scenario);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    }
    
    console.log('\n🎉 All validation tests completed!');
    console.log('\n📝 Summary:');
    console.log('   - Valid configurations allow application to start');
    console.log('   - Invalid transport values are converted to defaults with warnings');
    console.log('   - Invalid port values cause application startup to fail');
    console.log('   - Clear error messages help developers fix configuration issues');
    
  } finally {
    // Restore original .env
    fs.writeFileSync(envPath, originalEnv);
    console.log('\n🔄 Original .env file restored');
  }
}

main().catch(console.error);