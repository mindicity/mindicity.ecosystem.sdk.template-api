#!/usr/bin/env node

/**
 * Simple script to list available MCP tools
 * 
 * Usage: node scripts/list-mcp-tools.js [transport] [port]
 * 
 * Examples:
 *   node scripts/list-mcp-tools.js http 3235
 *   node scripts/list-mcp-tools.js sse 3236
 */

const { execSync } = require('child_process');

const transport = process.argv[2] || 'sse';
const port = process.argv[3] || '3235';

console.log(`🔍 Listing MCP tools for ${transport.toUpperCase()} transport on port ${port}...\n`);

try {
  if (transport === 'http' || transport === 'sse') {
    // Test tools/list
    console.log('📋 Available Tools:');
    const toolsResult = execSync(
      `curl -s -X POST http://localhost:${port}/mcp -H "Content-Type: application/json" -d "{\\"jsonrpc\\": \\"2.0\\", \\"id\\": 1, \\"method\\": \\"tools/list\\", \\"params\\": {}}"`,
      { encoding: 'utf8' }
    );
    
    const toolsResponse = JSON.parse(toolsResult);
    if (toolsResponse.result && toolsResponse.result.tools) {
      toolsResponse.result.tools.forEach((tool, index) => {
        console.log(`\n${index + 1}. ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        console.log(`   Input Schema: ${JSON.stringify(tool.inputSchema, null, 2).split('\n').join('\n   ')}`);
      });
    }

    // Test info endpoint for SSE
    if (transport === 'sse') {
      console.log('\n\nℹ️  Server Info:');
      const infoResult = execSync(
        `curl -s http://localhost:${port}/mcp/info`,
        { encoding: 'utf8' }
      );
      const info = JSON.parse(infoResult);
      console.log(`   Server: ${info.serverName} v${info.version}`);
      console.log(`   Transport: ${info.transport}`);
      console.log(`   Active Connections: ${info.activeConnections}`);
      console.log(`   Endpoints:`);
      console.log(`     - Events: http://localhost:${port}${info.endpoints.events}`);
      console.log(`     - Requests: http://localhost:${port}${info.endpoints.requests}`);
      console.log(`     - Info: http://localhost:${port}${info.endpoints.info}`);
    }

    console.log('\n✅ MCP server is working correctly!');
  } else if (transport === 'stdio') {
    console.log('ℹ️  STDIO transport uses standard input/output for communication.');
    console.log('   It requires an MCP client to test interactively.');
    console.log('   The tools are handled by the McpServerService automatically.');
  } else {
    console.log(`❌ Unknown transport: ${transport}`);
    console.log('   Supported transports: http, sse, stdio');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure the MCP server is running:');
  console.log('   npm run dev');
  process.exit(1);
}
