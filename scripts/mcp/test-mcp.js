#!/usr/bin/env node

/**
 * Simple MCP server test script
 * 
 * This script helps test the MCP server functionality by simulating
 * basic tool calls that an AI agent would make.
 * 
 * Usage: node scripts/test-mcp.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 Testing MCP Server Integration...\n');

// Check if the application is built
const distPath = path.join(__dirname, '..', 'dist', 'main.js');
const fs = require('fs');

if (!fs.existsSync(distPath)) {
  console.error('❌ Application not built. Please run: npm run build');
  process.exit(1);
}

// Set test environment variables
const testEnv = {
  ...process.env,
  MCP_ENABLED: 'true',
  MCP_TRANSPORT: 'stdio',
  MCP_PORT: '3234',
  MCP_HOST: 'localhost',
  MCP_SERVER_NAME: 'test-api',
  MCP_SERVER_VERSION: '1.0.0-test',
  APP_LOG_LEVEL: 'info',
  NODE_ENV: 'test'
};

console.log('📋 Test Configuration:');
console.log(`   MCP_ENABLED: ${testEnv.MCP_ENABLED}`);
console.log(`   MCP_TRANSPORT: ${testEnv.MCP_TRANSPORT}`);
console.log(`   MCP_PORT: ${testEnv.MCP_PORT}`);
console.log(`   MCP_HOST: ${testEnv.MCP_HOST}`);
console.log(`   MCP_SERVER_NAME: ${testEnv.MCP_SERVER_NAME}`);
console.log(`   MCP_SERVER_VERSION: ${testEnv.MCP_SERVER_VERSION}\n`);

// Start the application
console.log('🚀 Starting application with MCP server...');
const app = spawn('node', [distPath], {
  env: testEnv,
  stdio: ['pipe', 'pipe', 'pipe']
});

let startupComplete = false;
let mcpServerStarted = false;

// Monitor application output
app.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('MCP server connected and ready for AI agent connections')) {
    mcpServerStarted = true;
    console.log('✅ MCP server started successfully');
  }
  
  if (output.includes('🤖 MCP Server:')) {
    console.log('✅ MCP server configuration logged');
  }
  
  if (output.includes('Application is running on')) {
    startupComplete = true;
    console.log('✅ Application started successfully');
  }
  
  // Show important log messages
  if (output.includes('ERROR') || output.includes('WARN')) {
    console.log('⚠️  Application log:', output.trim());
  }
});

app.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('ERROR') || error.includes('Error')) {
    console.error('❌ Application error:', error.trim());
  }
});

// Test timeout
const testTimeout = setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  cleanup();
}, 10000);

// Cleanup function
function cleanup() {
  clearTimeout(testTimeout);
  if (app && !app.killed) {
    app.kill('SIGTERM');
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

app.on('close', (code) => {
  clearTimeout(testTimeout);
  
  console.log('\n📊 Test Results:');
  console.log(`   Application startup: ${startupComplete ? '✅ Success' : '❌ Failed'}`);
  console.log(`   MCP server startup: ${mcpServerStarted ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Exit code: ${code}`);
  
  if (startupComplete && mcpServerStarted) {
    console.log('\n🎉 MCP server integration test passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Connect your AI agent to the MCP server');
    console.log('   2. Test the built-in tools: get_api_info, get_api_health, list_api_endpoints');
    console.log('   3. Add custom tools by extending McpServerService');
    process.exit(0);
  } else {
    console.log('\n❌ MCP server integration test failed');
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check that all dependencies are installed: npm install');
    console.log('   2. Verify the application builds: npm run build');
    console.log('   3. Check environment variables in .env file');
    console.log('   4. Review application logs for errors');
    process.exit(1);
  }
});

// Give the application time to start
setTimeout(() => {
  if (!startupComplete) {
    console.log('⏳ Application is taking longer than expected to start...');
  }
}, 5000);