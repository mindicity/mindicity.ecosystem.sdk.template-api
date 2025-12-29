#!/usr/bin/env node

/**
 * Test script per le MCP resources (Swagger documentation)
 * 
 * Usage: node scripts/mcp/test-resources.js [transport] [port]
 */

const { execSync } = require('child_process');

const transport = process.argv[2] || 'http';
const port = process.argv[3] || '3235';

console.log(`🧪 Testing MCP Resources for ${transport.toUpperCase()} transport on port ${port}...\n`);

try {
  if (transport === 'http' || transport === 'sse') {
    // Test resources/list
    console.log('📚 Testing resources/list...');
    const resourcesResult = execSync(
      `curl -s -X POST http://localhost:${port}/mcp -H "Content-Type: application/json" -d @scripts/mcp/json/test-resources-list.json`,
      { encoding: 'utf8' }
    );
    
    const resourcesResponse = JSON.parse(resourcesResult);
    if (resourcesResponse.result && resourcesResponse.result.resources) {
      console.log('  ✅ resources/list: SUCCESS');
      console.log(`     Found ${resourcesResponse.result.resources.length} resources:`);
      resourcesResponse.result.resources.forEach((resource, index) => {
        console.log(`     ${index + 1}. ${resource.name}`);
        console.log(`        URI: ${resource.uri}`);
        console.log(`        Type: ${resource.mimeType}`);
      });
    } else {
      console.log('  ❌ resources/list: FAILED');
      console.log('     Response:', JSON.stringify(resourcesResponse, null, 2));
    }

    // Test resources/read for Swagger specs
    console.log('\n📖 Testing resources/read (Swagger specs)...');
    const swaggerResult = execSync(
      `curl -s -X POST http://localhost:${port}/mcp -H "Content-Type: application/json" -d @scripts/mcp/json/test-swagger-resource.json`,
      { encoding: 'utf8' }
    );
    
    const swaggerResponse = JSON.parse(swaggerResult);
    if (swaggerResponse.result && swaggerResponse.result.contents) {
      console.log('  ✅ resources/read (Swagger specs): SUCCESS');
      const content = JSON.parse(swaggerResponse.result.contents[0].text);
      console.log(`     OpenAPI Version: ${content.openapi}`);
      console.log(`     API Title: ${content.info.title}`);
      console.log(`     API Version: ${content.info.version}`);
      console.log(`     Available Paths: ${Object.keys(content.paths).length}`);
    } else {
      console.log('  ❌ resources/read (Swagger specs): FAILED');
      console.log('     Response:', JSON.stringify(swaggerResponse, null, 2));
    }

    // Test resources/read for Swagger UI
    console.log('\n🌐 Testing resources/read (Swagger UI)...');
    const swaggerUiResult = execSync(
      `curl -s -X POST http://localhost:${port}/mcp -H "Content-Type: application/json" -d @scripts/mcp/json/test-swagger-ui-resource.json`,
      { encoding: 'utf8' }
    );
    
    const swaggerUiResponse = JSON.parse(swaggerUiResult);
    if (swaggerUiResponse.result && swaggerUiResponse.result.contents) {
      console.log('  ✅ resources/read (Swagger UI): SUCCESS');
      const content = swaggerUiResponse.result.contents[0].text;
      if (content.includes('Swagger UI is available at:')) {
        console.log('     Swagger UI information provided successfully');
        const lines = content.split('\n');
        console.log(`     URL: ${lines[0].replace('Swagger UI is available at: ', '')}`);
      }
    } else {
      console.log('  ❌ resources/read (Swagger UI): FAILED');
      console.log('     Response:', JSON.stringify(swaggerUiResponse, null, 2));
    }

    console.log('\n🎉 MCP Resources testing completed!');
    
  } else if (transport === 'stdio') {
    console.log('ℹ️  STDIO transport uses MCP SDK handlers automatically');
    console.log('  ✅ resources/list: Handled by McpServerService');
    console.log('  ✅ resources/read: Handled by McpServerService');
    console.log('  📝 Note: STDIO requires interactive testing with MCP client');
  } else {
    console.log(`❌ Unknown transport: ${transport}`);
    console.log('   Supported transports: http, sse, stdio');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.log('\n💡 Make sure the MCP server is running:');
  console.log('   npm run dev');
  process.exit(1);
}