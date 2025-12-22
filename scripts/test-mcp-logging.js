#!/usr/bin/env node

/**
 * Test MCP logging for different transports
 */

const { spawn } = require('child_process');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist', 'main.js');
const fs = require('fs');

if (!fs.existsSync(distPath)) {
  console.error('❌ Application not built. Please run: npm run build');
  process.exit(1);
}

async function testTransport(transport, port) {
  console.log(`\n🧪 Testing ${transport.toUpperCase()} transport...\n`);
  
  const testEnv = {
    ...process.env,
    MCP_ENABLED: 'true',
    MCP_TRANSPORT: transport,
    MCP_PORT: port.toString(),
    MCP_HOST: 'localhost',
    MCP_SERVER_NAME: 'test-api',
    MCP_SERVER_VERSION: '1.0.0-test',
    APP_PORT: '3232',
    DB_CHECK: 'false',
  };

  return new Promise((resolve) => {
    const app = spawn('node', [distPath], {
      env: testEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let foundMcpLog = false;

    app.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Look for MCP server log
      if (text.includes('🤖 MCP Server:')) {
        foundMcpLog = true;
        console.log('✅ Found MCP Server log:');
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.includes('MCP') || line.includes('📡') || line.includes('📨') || line.includes('ℹ️')) {
            console.log('   ' + line.trim());
          }
        });
      }
    });

    // Kill after 3 seconds
    setTimeout(() => {
      app.kill();
      if (foundMcpLog) {
        console.log(`\n✅ ${transport.toUpperCase()} transport logging test passed!\n`);
      } else {
        console.log(`\n❌ ${transport.toUpperCase()} transport logging test failed - no MCP log found\n`);
      }
      resolve();
    }, 3000);
  });
}

async function main() {
  console.log('🧪 Testing MCP Server Logging for Different Transports\n');
  console.log('=' .repeat(60));
  
  await testTransport('stdio', 3234);
  await testTransport('http', 3235);
  await testTransport('sse', 3236);
  
  console.log('=' .repeat(60));
  console.log('\n✅ All transport logging tests completed!\n');
}

main().catch(console.error);
