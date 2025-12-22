# MCP Server Integration Guide

## Overview

The Mindicity API Template includes a built-in **Model Context Protocol (MCP) server** that enables AI agents to interact with your API through structured tools and resources. This integration allows AI assistants like Kiro to query API information, check health status, access Swagger documentation, and list available endpoints.

## Transport Architecture

### Default Transport: HTTP

**By default, all MCP tools and resources are implemented via HTTP transport**, which provides:

- ✅ **Complete MCP functionality** - All tools and resources available
- ✅ **RESTful API compatibility** - Standard HTTP requests/responses  
- ✅ **Easy testing and debugging** - Use any HTTP client (curl, Postman, etc.)
- ✅ **MCP Inspector compatibility** - Works with all MCP debugging tools
- ✅ **Production ready** - Robust error handling and logging

### Optional Transport: SSE (Server-Sent Events)

**SSE transport provides basic connectivity only** and should be explicitly requested:

- ⚠️ **Limited functionality** - Only supports `initialize` method
- ⚠️ **No tools or resources** - Redirects to HTTP transport for full functionality  
- ✅ **Real-time events** - Suitable for streaming notifications (future use)
- ✅ **Lightweight** - Minimal overhead for basic connectivity

### Transport Selection Guidelines

**Use HTTP transport (default) when:**
- You need full MCP functionality (tools and resources)
- You're using MCP Inspector or other debugging tools
- You want the most robust and tested implementation
- You're building production applications

**Use SSE transport only when:**
- Explicitly required for real-time event streaming
- You only need basic MCP initialization
- You understand the limitations and will use HTTP for actual functionality

## Architecture

### Components

```
src/
├── config/
│   └── mcp.config.ts              # MCP server configuration with Zod validation
├── infrastructure/
│   └── mcp/
│       ├── mcp.module.ts          # NestJS module for MCP server
│       ├── mcp-server.service.ts  # MCP server implementation
│       ├── mcp.module.spec.ts     # Module unit tests
│       └── mcp-server.service.spec.ts  # Service unit tests
└── app.module.ts                  # Imports McpModule
```

### Design Principles

1. **Infrastructure Isolation**: MCP server is in `src/infrastructure/mcp/` following the template's architecture
2. **Configuration-Driven**: All settings managed through environment variables with Zod validation
3. **Lifecycle Management**: Implements `OnModuleInit` and `OnModuleDestroy` for proper startup/shutdown
4. **Context-Aware Logging**: Uses `ContextLoggerService` for consistent logging patterns
5. **Extensible**: Easy to add custom tools and resources for your specific API needs

## Configuration

### Environment Variables

```bash
# MCP Server Configuration
MCP_ENABLED=true                    # Enable/disable MCP server (default: true)
MCP_TRANSPORT=http                  # Transport type: stdio, http, sse (default: http for full functionality)
MCP_PORT=3235                      # MCP server port for HTTP/SSE (default: 3235)
MCP_HOST=localhost                 # MCP server host for HTTP/SSE (default: localhost)
MCP_SERVER_NAME=mindicity-api-template  # Server identifier (optional: defaults to package.json name)
MCP_SERVER_VERSION=1.0.0           # Server version (optional: defaults to package.json version)
```

### Transport Configuration

**HTTP Transport (Recommended Default):**
```bash
MCP_TRANSPORT=http
MCP_HOST=localhost
MCP_PORT=3235
```
- **Endpoint**: `http://localhost:3235/mcp`
- **Features**: Complete tools and resources implementation
- **Use Case**: Production applications, MCP Inspector, full functionality

**STDIO Transport:**
```bash
MCP_TRANSPORT=stdio
# No host/port needed
```
- **Interface**: Standard input/output
- **Features**: Complete tools and resources via MCP SDK
- **Use Case**: Command-line integration, terminal-based AI agents

**SSE Transport (Limited):**
```bash
MCP_TRANSPORT=sse
MCP_HOST=localhost
MCP_PORT=3235
```
- **Endpoints**: 
  - SSE: `http://localhost:3235/mcp/events` (basic connectivity only)
  - HTTP: `http://localhost:3235/mcp` (for tools and resources)
- **Features**: Basic initialization only, redirects to HTTP for functionality
- **Use Case**: Real-time events (when explicitly required)

### ✅ Enhanced Configuration: Automatic Package.json Integration

**What's New:**
- **MCP_SERVER_VERSION**: Now automatically defaults to `package.json` version
- **MCP_SERVER_NAME**: Now automatically defaults to `package.json` name
- **Zero Configuration**: When running via npm scripts, both values are automatically detected
- **Fallback Support**: Graceful fallback to sensible defaults when package.json values aren't available

**Automatic Detection Behavior:**

1. **When running via npm scripts** (`npm start`, `npm run dev`):
   - `MCP_SERVER_NAME` → `nestjs-template-api` (from package.json)
   - `MCP_SERVER_VERSION` → `1.0.0` (from package.json)

2. **When running built application directly** (`node dist/main.js`):
   - `MCP_SERVER_NAME` → `mindicity-api-template` (fallback)
   - `MCP_SERVER_VERSION` → `1.0.0` (fallback)

3. **When environment variables are set**:
   - Always uses the explicit environment variable values
   - Overrides both package.json and fallback values

### ✅ Robust Configuration Validation

**Enhanced Validation Features:**
- **Input Validation**: All MCP configuration values are validated at startup
- **Clear Error Messages**: Detailed feedback when configuration is invalid
- **Fail-Fast Behavior**: Application stops immediately with invalid configuration
- **No Log Duplication**: Smart caching prevents repeated error messages

**Validation Rules:**
- `MCP_TRANSPORT`: Must be one of `stdio`, `http`, `sse` (invalid values use `stdio` default)
- `MCP_PORT`: Must be 1-65535 (invalid values cause application startup failure)
- `MCP_HOST`: Cannot be empty
- `MCP_SERVER_NAME`: Cannot be empty
- `MCP_SERVER_VERSION`: Cannot be empty

**Example Validation Behavior:**

```bash
# Invalid transport (uses default with warning)
❌ Invalid value for MCP_TRANSPORT: "https". Allowed values: [stdio, http, sse]. Using default: stdio
🤖 MCP Server: stdio transport (name: nestjs-template-api)

# Invalid port (application fails to start)
❌ MCP Configuration validation failed: port: MCP port must be at most 65535
🔧 Please check your environment variables and fix the configuration.
💥 Application startup aborted due to invalid MCP configuration.
```

### Configuration Schema

The MCP configuration is validated using Zod with enhanced error handling:

```typescript
const McpConfigSchema = z.object({
  enabled: z.boolean().default(true),
  transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  port: z.number().int().min(1, 'MCP port must be at least 1').max(65535, 'MCP port must be at most 65535').default(3233),
  host: z.string().min(1, 'MCP host cannot be empty').default('localhost'),
  serverName: z.string().min(1, 'MCP server name cannot be empty').default('mindicity-api-template'),
  serverVersion: z.string().min(1, 'MCP server version cannot be empty').default('1.0.0'),
});
```

## Transport Types

The MCP server supports three different transport types:

### 1. Stdio Transport (Default)

Uses standard input/output for communication. Ideal for command-line tools and direct process communication.

**Configuration:**
```bash
MCP_TRANSPORT=stdio
# No additional configuration needed
```

**Use Cases:**
- Command-line AI tools
- Direct process spawning
- Development and testing

### 2. HTTP Transport

Provides HTTP endpoints for MCP communication. Suitable for web-based AI agents and REST API integration.

**Configuration:**
```bash
MCP_TRANSPORT=http
MCP_HOST=localhost
MCP_PORT=3233
```

**Endpoints:**
- `POST http://localhost:3233/mcp` - MCP request endpoint

**Use Cases:**
- Web-based AI agents
- HTTP client integration
- Load balancing scenarios

### 3. SSE Transport (Server-Sent Events)

Combines HTTP requests with real-time event streaming. Perfect for web applications requiring real-time updates.

**Configuration:**
```bash
MCP_TRANSPORT=sse
MCP_HOST=localhost
MCP_PORT=3233
```

**Endpoints:**
- `GET http://localhost:3233/mcp/events` - SSE event stream
- `POST http://localhost:3233/mcp` - MCP request endpoint
- `GET http://localhost:3233/mcp/info` - Server information

**Use Cases:**
- Real-time web applications
- Dashboard integrations
- Live monitoring systems

## Built-in Tools

The MCP server provides three built-in tools for AI agents:

### 1. get_api_info

Returns comprehensive API information including configuration and endpoints.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output:**
```json
{
  "name": "mindicity-api-template",
  "version": "1.0.0",
  "port": 3232,
  "apiPrefix": "/mcapi",
  "apiScopePrefix": "",
  "corsEnabled": true,
  "swaggerUrl": "http://localhost:3232/mcapi/docs/swagger/ui"
}
```

### 2. get_api_health

Provides real-time health status, uptime, and memory usage.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T10:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576,
    "arrayBuffers": 524288
  }
}
```

### 3. list_api_endpoints

Lists all available API endpoints with methods and descriptions.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

**Output:**
```json
[
  {
    "method": "GET",
    "path": "/mcapi/health",
    "description": "Health check endpoint"
  },
  {
    "method": "GET",
    "path": "/mcapi/template",
    "description": "Template module endpoints (to be customized)"
  },
  {
    "method": "GET",
    "path": "/mcapi/docs/swagger/ui",
    "description": "Swagger API documentation"
  }
]
```

## Built-in Resources

The MCP server provides access to API documentation through resources:

### 1. API Swagger Specification

**URI:** `swagger://api-docs/project/swagger/specs`
**MIME Type:** `application/json`
**Description:** Complete OpenAPI/Swagger specification for all API endpoints

**Content:** Full OpenAPI 3.0 specification including:
- API metadata (title, version, description)
- Server information
- All endpoint definitions
- Request/response schemas
- Authentication requirements

### 2. API Swagger UI

**URI:** `swagger://api-docs/project/swagger/ui`
**MIME Type:** `text/html`
**Description:** Interactive Swagger UI information and access instructions

**Content:** Information about accessing the Swagger UI including:
- Direct URL to interactive documentation
- Usage instructions for testing endpoints
- Feature overview (explore, test, view schemas)

### Using Resources

AI agents can access resources using standard MCP protocol:

```json
// List all available resources
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {}
}

// Read Swagger specification
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "swagger://api-docs/project/swagger/specs"
  }
}
```

For detailed resource documentation, see [MCP Resources Guide](./mcp-resources.md).

## Connecting AI Agents

### Kiro Configuration

To connect Kiro to your API's MCP server, add this configuration to your MCP settings:

```json
{
  "mcpServers": {
    "your-api-name": {
      "command": "node",
      "args": ["path/to/your/api/dist/main.js"],
      "env": {
        "MCP_ENABLED": "true",
        "MCP_PORT": "3233",
        "MCP_SERVER_NAME": "your-api-name",
        "MCP_SERVER_VERSION": "1.0.0"
      }
    }
  }
}
```

### Expected Startup Logs

When the application starts with MCP enabled, you should see these log messages:

```
🤖 MCP Server: stdio transport (port: 3233, name: mindicity-api-template)
🚀 Application is running on: http://localhost:3232/mcapi
📚 Swagger UI: http://localhost:3232/mcapi/docs/swagger/ui
📋 Swagger Specs: http://localhost:3232/mcapi/docs/swagger/specs
❤️  Health check: http://localhost:3232/mcapi/health/ping
```

The MCP server log appears before the main application startup logs, indicating that the MCP server is configured and ready for AI agent connections.

## Extending MCP Tools

### Adding Custom Tools

To add custom tools specific to your API, extend the `McpServerService`:

```typescript
// src/infrastructure/mcp/custom-mcp-tools.service.ts
import { Injectable } from '@nestjs/common';
import { McpServerService } from './mcp-server.service';

@Injectable()
export class CustomMcpToolsService {
  constructor(private readonly mcpServerService: McpServerService) {}

  registerCustomTools(): void {
    // Add your custom tool registration here
    // Example: Register a tool to query users
    this.registerUserQueryTool();
  }

  private registerUserQueryTool(): void {
    // Tool registration logic
  }
}
```

### Tool Registration Pattern

```typescript
private setupCustomToolHandlers(): void {
  if (!this.server) return;

  // Add to tools list
  this.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // ... existing tools
        {
          name: 'query_users',
          description: 'Query users from the database',
          inputSchema: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'Search term' },
              limit: { type: 'number', description: 'Max results' }
            },
            required: []
          }
        }
      ]
    };
  });

  // Handle tool calls
  this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'query_users') {
      return await this.handleQueryUsers(args);
    }
    
    // ... handle other tools
  });
}
```

## Adding Resources

Resources provide static or dynamic content that AI agents can access:

```typescript
private setupResourceHandlers(): void {
  if (!this.server) return;

  // List available resources
  this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'api://schema/users',
          name: 'User Schema',
          description: 'JSON schema for user objects',
          mimeType: 'application/json'
        }
      ]
    };
  });

  // Read resource content
  this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    if (uri === 'api://schema/users') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(userSchema, null, 2)
          }
        ]
      };
    }
  });
}
```

## Testing

### Unit Tests

The MCP integration includes comprehensive unit tests:

```bash
# Run all tests
npm run test

# Run MCP-specific tests
npm run test -- mcp
```

### E2E Tests

End-to-end tests verify the MCP server integration:

```bash
npm run test:e2e
```

### Manual Testing

Use the provided test script:

```bash
npm run test:mcp
```

This script:
1. Builds the application
2. Starts the MCP server
3. Verifies successful initialization
4. Reports test results

### Configuration Validation Testing

Test the enhanced configuration validation:

```bash
# Test all validation scenarios
node scripts/test-mcp-validation.js
```

This validation test script verifies:
1. **Valid Configuration**: Application starts successfully with correct settings
2. **Invalid Transport**: Application uses default with warning for invalid transport values
3. **Invalid Port (too high)**: Application fails to start with clear error message
4. **Invalid Port (too low)**: Application fails to start with validation error

**Expected Test Results:**

```bash
🧪 Testing MCP Configuration Validation

📋 Testing: Valid Configuration
   Config: MCP_TRANSPORT=http, MCP_PORT=3235
   ✅ Result: Application started successfully
   ✅ Expected log found: Yes

📋 Testing: Invalid Transport
   Config: MCP_TRANSPORT=invalid_transport, MCP_PORT=3235
   ✅ Result: Application started successfully
   ✅ Expected log found: Yes

📋 Testing: Invalid Port (too high)
   Config: MCP_TRANSPORT=http, MCP_PORT=99999
   ❌ Result: Application failed to start (exit code: 1)
   ✅ Expected log found: Yes

📋 Testing: Invalid Port (too low)
   Config: MCP_TRANSPORT=http, MCP_PORT=0
   ❌ Result: Application failed to start (exit code: 1)
   ✅ Expected log found: Yes

🎉 All validation tests completed!
```

## Troubleshooting

### MCP Server Not Starting

**Symptom:** No "🤖 MCP Server: stdio transport" log message during startup

**Solutions:**
1. Check `MCP_ENABLED=true` in `.env`
2. Verify port is not in use: `netstat -ano | findstr :3233`
3. Check application logs for errors
4. Ensure all dependencies installed: `npm install`

### Configuration Validation Errors

**Symptom:** Application fails to start with configuration validation errors

**Common Issues and Solutions:**

1. **Invalid Transport Value:**
   ```bash
   ❌ Invalid value for MCP_TRANSPORT: "https". Allowed values: [stdio, http, sse]. Using default: stdio
   ```
   **Solution:** Use only `stdio`, `http`, or `sse` for `MCP_TRANSPORT`

2. **Invalid Port Range:**
   ```bash
   ❌ MCP Configuration validation failed: port: MCP port must be at most 65535
   ```
   **Solution:** Set `MCP_PORT` to a value between 1 and 65535

3. **Empty Configuration Values:**
   ```bash
   ❌ MCP Configuration validation failed: serverName: MCP server name cannot be empty
   ```
   **Solution:** Ensure `MCP_SERVER_NAME` is not empty or let it use package.json default

### Port Already in Use

**Symptom:** Error about port 3233 being in use

**Solutions:**
1. Change `MCP_PORT` to a different port
2. Stop other processes using the port
3. Use `netstat` to identify conflicting processes

### AI Agent Cannot Connect

**Symptom:** AI agent fails to connect to MCP server

**Solutions:**
1. Verify application is running: `npm start`
2. Check MCP configuration in AI agent settings
3. Ensure correct path to `dist/main.js`
4. Verify environment variables are set correctly
5. Check firewall settings
6. Test configuration validation: `node scripts/test-mcp-validation.js`

### Tools Not Working

**Symptom:** MCP tools return errors or unexpected results

**Solutions:**
1. Check tool input schema matches expected format
2. Verify API is running and healthy
3. Review application logs for errors
4. Test tools individually using the test script
5. Ensure configuration is valid (no validation errors on startup)

### Duplicate Log Messages

**Symptom:** Same error message appears multiple times in logs

**Solution:** This has been fixed in the latest version. The system now uses smart caching to prevent duplicate error messages. If you still see duplicates, ensure you're using the latest version of the template.

## Best Practices

### 1. Tool Design

- **Keep tools focused**: Each tool should do one thing well
- **Clear descriptions**: Help AI agents understand when to use each tool
- **Validate inputs**: Use JSON schema to validate tool parameters
- **Handle errors gracefully**: Return meaningful error messages

### 2. Security

- **No sensitive data**: Don't expose secrets or credentials through MCP tools
- **Input validation**: Always validate and sanitize tool inputs
- **Rate limiting**: Consider adding rate limits for resource-intensive tools
- **Authentication**: MCP tools should respect API authentication

### 3. Performance

- **Async operations**: Use async/await for all I/O operations
- **Caching**: Cache frequently accessed data
- **Timeouts**: Set reasonable timeouts for long-running operations
- **Logging**: Use appropriate log levels (trace for tool calls, error for failures)

### 4. Maintenance

- **Version your tools**: Update `MCP_SERVER_VERSION` when adding/changing tools (or let it use package.json version automatically)
- **Document changes**: Keep this guide updated with new tools and resources
- **Test thoroughly**: Add unit and E2E tests for custom tools
- **Monitor usage**: Log tool usage for debugging and optimization

## Integration with Bootstrap Process

When bootstrapping a new API from this template:

1. **MCP configuration is preserved**: Environment variables are copied to new project
2. **Server name is updated**: `MCP_SERVER_NAME` is set to new API name
3. **Tools remain functional**: Built-in tools work immediately
4. **Customization ready**: Add custom tools specific to your API domain

## Example: Custom Tool Implementation

Here's a complete example of adding a custom tool to query database records:

```typescript
// src/infrastructure/mcp/tools/database-query.tool.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ContextLoggerService } from '../../../common/services/context-logger.service';

@Injectable()
export class DatabaseQueryTool {
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly databaseService: DatabaseService,
    loggerService: ContextLoggerService
  ) {
    this.logger = loggerService.child({ serviceContext: 'DatabaseQueryTool' });
  }

  async execute(args: { table: string; limit?: number }): Promise<any> {
    this.logger.trace('Executing database query tool', { args });

    const { table, limit = 10 } = args;

    try {
      const sql = `SELECT * FROM ${table} LIMIT $1`;
      const results = await this.databaseService.queryMany(sql, [limit]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error) {
      this.logger.error('Database query tool failed', { err: error, args });
      throw error;
    }
  }
}
```

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [Mindicity API Development Guide](.kiro/steering/mindicity-api-base-steering.md)
- [Bootstrap Process Guide](.kiro/steering/mindicity-api-bootstrap-steering.md)