#!/usr/bin/env node

/**
 * Test MCP configuration parsing
 */

// Set test environment variables
process.env.MCP_ENABLED = 'true';
process.env.MCP_TRANSPORT = 'sse';
process.env.MCP_PORT = '3233';
process.env.MCP_HOST = 'localhost';

// Import the config after setting env vars
const mcpConfig = require('../dist/config/mcp.config.js').default;

console.log('🧪 Testing MCP Configuration Parsing\n');

try {
  const config = mcpConfig();
  console.log('✅ MCP Config parsed successfully:');
  console.log('   enabled:', config.enabled);
  console.log('   transport:', config.transport);
  console.log('   port:', config.port);
  console.log('   host:', config.host);
  console.log('   serverName:', config.serverName);
  console.log('   serverVersion:', config.serverVersion);
  
  if (config.transport === 'sse') {
    console.log('\n✅ SSE transport correctly parsed!');
  } else {
    console.log(`\n❌ Expected 'sse', got '${config.transport}'`);
  }
} catch (error) {
  console.error('❌ Error parsing MCP config:', error);
}