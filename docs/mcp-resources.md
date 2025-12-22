# MCP Resources - Swagger Documentation Integration

## Overview

The MCP (Model Context Protocol) server now supports **resources** in addition to tools. Resources provide AI agents with access to API documentation, specifically Swagger/OpenAPI specifications and interactive documentation.

## Available Resources

### 1. API Swagger Specification
- **URI**: `swagger://api-docs/project/swagger/specs`
- **Name**: API Swagger Specification
- **Description**: Complete OpenAPI/Swagger specification for the API endpoints
- **MIME Type**: `application/json`
- **Content**: Full OpenAPI 3.0 specification with all endpoints, schemas, and documentation

### 2. API Swagger UI
- **URI**: `swagger://api-docs/project/swagger/ui`
- **Name**: API Swagger UI
- **Description**: Interactive Swagger UI for exploring and testing API endpoints
- **MIME Type**: `text/html`
- **Content**: Information about accessing the interactive Swagger UI

## Transport Support

All three MCP transports support resources:

### HTTP Transport
```bash
# List available resources
curl -X POST http://localhost:3235/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/list",
    "params": {}
  }'

# Read Swagger specification
curl -X POST http://localhost:3235/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/read",
    "params": {
      "uri": "swagger://api-docs/project/swagger/specs"
    }
  }'
```

### SSE Transport
```bash
# Same as HTTP, but also includes info endpoint
curl http://localhost:3235/mcp/info

# Shows both tools and resources in the response
```

### STDIO Transport
Resources are handled automatically by the MCP SDK when using STDIO transport. AI agents can request `resources/list` and `resources/read` through the standard MCP protocol.

## Usage Examples

### 1. List All Resources
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "swagger://api-docs/project/swagger/specs",
        "name": "API Swagger Specification",
        "description": "Complete OpenAPI/Swagger specification for the API endpoints",
        "mimeType": "application/json"
      },
      {
        "uri": "swagger://api-docs/project/swagger/ui",
        "name": "API Swagger UI",
        "description": "Interactive Swagger UI for exploring and testing API endpoints",
        "mimeType": "text/html"
      }
    ]
  }
}
```

### 2. Read Swagger Specification
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "swagger://api-docs/project/swagger/specs"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "swagger://api-docs/project/swagger/specs",
        "mimeType": "application/json",
        "text": "{\n  \"openapi\": \"3.0.0\",\n  \"info\": {\n    \"title\": \"nestjs-template-api\",\n    \"version\": \"1.0.0\",\n    \"description\": \"API documentation available via Swagger UI\"\n  },\n  \"servers\": [\n    {\n      \"url\": \"http://localhost:3232/mcapi\",\n      \"description\": \"API Server\"\n    }\n  ],\n  \"paths\": {\n    \"/health/project/ping\": {\n      \"get\": {\n        \"tags\": [\"health\"],\n        \"summary\": \"Health check endpoint\",\n        \"responses\": {\n          \"200\": {\n            \"description\": \"API is healthy\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"type\": \"object\",\n                  \"properties\": {\n                    \"status\": {\n                      \"type\": \"string\",\n                      \"example\": \"ok\"\n                    },\n                    \"timestamp\": {\n                      \"type\": \"string\",\n                      \"format\": \"date-time\"\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  },\n  \"note\": \"Complete API documentation is available at: http://localhost:3232/mcapi/docs/project/swagger/specs\"\n}"
      }
    ]
  }
}
```

### 3. Read Swagger UI Information
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/read",
  "params": {
    "uri": "swagger://api-docs/project/swagger/ui"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "contents": [
      {
        "uri": "swagger://api-docs/project/swagger/ui",
        "mimeType": "text/plain",
        "text": "Swagger UI is available at: http://localhost:3232/mcapi/docs/project/swagger/ui\n\nThis interactive documentation allows you to:\n- Explore all API endpoints\n- Test endpoints directly from the browser\n- View request/response schemas\n- Understand authentication requirements\n\nTo access the Swagger UI, open the URL above in your web browser."
      }
    ]
  }
}
```

## Testing Resources

### Quick Test Scripts

```bash
# Test all resources for HTTP transport
node scripts/mcp/test-resources.js http 3235

# Test all resources for SSE transport  
node scripts/mcp/test-resources.js sse 3235

# List both tools and resources
node scripts/mcp/list-mcp-tools.js http 3235
node scripts/mcp/list-mcp-tools.js sse 3235
```

### Comprehensive Testing

```bash
# Run full test suite including resources
node scripts/mcp/test-all-transports.js
```

## Configuration

Resources are automatically available when MCP is enabled. No additional configuration is required.

```env
# .env
MCP_ENABLED=true
MCP_PORT=3235
MCP_TRANSPORT=sse  # or 'http' or 'stdio'
```

## Benefits for AI Agents

1. **API Discovery**: Agents can discover all available API endpoints through Swagger specs
2. **Schema Understanding**: Complete request/response schemas for proper API usage
3. **Interactive Testing**: Direct access to Swagger UI for testing endpoints
4. **Documentation Access**: Full API documentation without external requests
5. **Dynamic Updates**: Resources reflect the current API state automatically

## Implementation Details

### Resource Generation
Resources are dynamically generated by the `McpServerService` based on:
- Current application configuration
- Swagger hostname and paths
- API prefix and scope settings

### Resource URIs
- **Swagger Specs**: `swagger://api-docs{apiScopePrefix}/swagger/specs`
- **Swagger UI**: `swagger://api-docs{apiScopePrefix}/swagger/ui`

### Content Types
- **JSON Specs**: Full OpenAPI specification with all endpoints
- **UI Info**: Plain text with Swagger UI URL and usage instructions

## Adding New Resources

To add new documentation resources, extend the `generateDynamicResources()` method in `McpServerService`:

```typescript
// Add new resource type
{
  uri: 'api://docs/postman-collection',
  name: 'Postman Collection',
  description: 'Postman collection for API testing',
  mimeType: 'application/json',
}
```

Then implement the corresponding handler in `handleDynamicResourceRead()`.

## Error Handling

Resources include comprehensive error handling:
- Invalid URIs return appropriate error responses
- Network failures are gracefully handled
- Fallback content is provided when resources are unavailable

## Security Considerations

- Resources only expose publicly available documentation
- No sensitive configuration or internal details are included
- All resource access is logged for monitoring
- CORS headers are properly configured for web access