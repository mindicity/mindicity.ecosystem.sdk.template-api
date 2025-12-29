# MCP Resources - Semantic URI Architecture

## Overview

The MCP (Model Context Protocol) server supports **resources** that provide AI agents with structured access to API documentation, schemas, examples, and configuration. Resources now use **semantic URI schemes** for better organization and AI agent understanding.

## 🚨 MANDATORY: Semantic URI Schemes

**CRITICAL:** All MCP resources MUST use standardized URI schemes for consistent organization across Mindicity APIs.

### Resource URI Schemes (MANDATORY)

| Scheme | Purpose | Examples | Description |
|--------|---------|----------|-------------|
| `doc://` | Documentation | `doc://openapi`, `doc://readme`, `doc://changelog` | API documentation, guides, specifications |
| `schema://` | JSON Schemas | `schema://user`, `schema://health`, `schema://error` | Data validation schemas, type definitions |
| `examples://` | Code Examples | `examples://auth`, `examples://crud`, `examples://health` | Request/response examples, usage patterns |
| `rules://` | Business Rules | `rules://validation`, `rules://permissions`, `rules://workflow` | Business logic, validation rules, policies |
| `config://` | Configuration | `config://routes`, `config://env`, `config://swagger` | Application configuration, settings |

### Resource Naming Convention (MANDATORY)

- **Pattern**: `{scheme}://{simple-id}`
- **Simple ID**: Use lowercase, single word or hyphenated identifiers
- **No Scope Prefix**: Remove project-specific prefixes for cleaner URIs
- **Semantic**: Choose meaningful, intention-based identifiers

## Available Resources

### 1. API OpenAPI Specification
- **URI**: `doc://openapi` ✅ **NEW STANDARD**
- **Legacy URI**: `swagger://api-docs/project/swagger/specs` ⚠️ **DEPRECATED**
- **Name**: API OpenAPI Specification
- **Description**: Complete OpenAPI/Swagger specification for the API endpoints
- **MIME Type**: `application/json`
- **Content**: Full OpenAPI 3.0 specification with all endpoints, schemas, and documentation

### 2. API Documentation
- **URI**: `doc://readme` ✅ **NEW STANDARD**
- **Name**: API Documentation
- **Description**: Main API documentation and usage guide
- **MIME Type**: `text/markdown`
- **Content**: Complete README with setup, usage, and examples

### 3. Health Check Schema
- **URI**: `schema://health` ✅ **NEW STANDARD**
- **Name**: Health Check Schema
- **Description**: JSON schema for health check responses
- **MIME Type**: `application/json`
- **Content**: Validation schema for health endpoint responses

### 4. Health Check Examples
- **URI**: `examples://health` ✅ **NEW STANDARD**
- **Name**: Health Check Examples
- **Description**: Example requests and responses for health endpoints
- **MIME Type**: `application/json`
- **Content**: Sample API calls and expected responses

### 5. Validation Rules
- **URI**: `rules://validation` ✅ **NEW STANDARD**
- **Name**: Validation Rules
- **Description**: Business validation rules and constraints
- **MIME Type**: `application/json`
- **Content**: API validation rules and business logic constraints

## Transport Support

All three MCP transports support resources:

### HTTP Transport Examples
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

# Read OpenAPI specification
curl -X POST http://localhost:3235/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/read",
    "params": {
      "uri": "doc://openapi"
    }
  }'

# Read health examples
curl -X POST http://localhost:3235/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/read",
    "params": {
      "uri": "examples://health"
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
        "uri": "doc://openapi",
        "name": "API OpenAPI Specification",
        "description": "Complete OpenAPI/Swagger specification for the API endpoints",
        "mimeType": "application/json"
      },
      {
        "uri": "doc://readme",
        "name": "API Documentation",
        "description": "Main API documentation and usage guide",
        "mimeType": "text/markdown"
      },
      {
        "uri": "schema://health",
        "name": "Health Check Schema",
        "description": "JSON schema for health check responses",
        "mimeType": "application/json"
      },
      {
        "uri": "examples://health",
        "name": "Health Check Examples",
        "description": "Example requests and responses for health endpoints",
        "mimeType": "application/json"
      }
    ]
  }
}
```

### 2. Read OpenAPI Specification
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "doc://openapi"
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
        "uri": "doc://openapi",
        "mimeType": "application/json",
        "text": "{\n  \"openapi\": \"3.0.0\",\n  \"info\": {\n    \"title\": \"nestjs-template-api\",\n    \"version\": \"1.0.0\",\n    \"description\": \"API documentation\"\n  },\n  \"servers\": [\n    {\n      \"url\": \"http://localhost:3232/mcapi\",\n      \"description\": \"API Server\"\n    }\n  ],\n  \"paths\": {\n    \"/health/ping\": {\n      \"get\": {\n        \"tags\": [\"health\"],\n        \"summary\": \"Health check endpoint\",\n        \"responses\": {\n          \"200\": {\n            \"description\": \"API is healthy\"\n          }\n        }\n      }\n    }\n  }\n}"
      }
    ]
  }
}
```

### 3. Read Health Check Examples
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/read",
  "params": {
    "uri": "examples://health"
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
        "uri": "examples://health",
        "mimeType": "application/json",
        "text": "{\n  \"examples\": {\n    \"healthCheck\": {\n      \"request\": {\n        \"method\": \"GET\",\n        \"url\": \"/mcapi/health/ping\"\n      },\n      \"response\": {\n        \"status\": 200,\n        \"body\": {\n          \"status\": \"ok\",\n          \"version\": \"1.0.0\",\n          \"timestamp\": \"2025-12-22T10:30:00.000Z\"\n        }\n      }\n    }\n  }\n}"
      }
    ]
  }
}
```

### 4. Read Health Check Schema
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/read",
  "params": {
    "uri": "schema://health"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "contents": [
      {
        "uri": "schema://health",
        "mimeType": "application/json",
        "text": "{\n  \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"status\": {\n      \"type\": \"string\",\n      \"enum\": [\"ok\", \"error\"]\n    },\n    \"version\": {\n      \"type\": \"string\"\n    },\n    \"timestamp\": {\n      \"type\": \"string\",\n      \"format\": \"date-time\"\n    }\n  },\n  \"required\": [\"status\", \"version\", \"timestamp\"]\n}"
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

1. **Semantic Understanding**: Clear URI schemes help agents understand resource types
2. **API Discovery**: Agents can discover all available API endpoints through OpenAPI specs
3. **Schema Validation**: Complete request/response schemas for proper API usage
4. **Example-Driven Learning**: Real examples help agents understand API usage patterns
5. **Rule-Based Validation**: Access to business rules and validation constraints
6. **Simplified URIs**: Clean, predictable resource identifiers
7. **Consistent Organization**: Standardized schemes across all Mindicity APIs

## Implementation Details

### Resource Generation
Resources are dynamically generated by the `McpServerService` using semantic URI schemes:

```typescript
// ✅ CORRECT: Semantic URI implementation
const resources = [
  {
    uri: 'doc://openapi',
    name: 'API OpenAPI Specification',
    description: 'Complete OpenAPI/Swagger specification for the API endpoints',
    mimeType: 'application/json',
  },
  {
    uri: 'schema://health',
    name: 'Health Check Schema',
    description: 'JSON schema for health check responses',
    mimeType: 'application/json',
  },
  {
    uri: 'examples://health',
    name: 'Health Check Examples',
    description: 'Example requests and responses for health endpoints',
    mimeType: 'application/json',
  },
];
```

### Resource Handler Pattern
```typescript
private async handleResourcesRead(req: { params?: { uri?: string } }, transport: any): Promise<void> {
  const uri = req.params?.uri;
  
  switch (uri) {
    case 'doc://openapi':
      await this.fetchOpenApiResource(uri, transport);
      break;
    case 'doc://readme':
      await this.fetchReadmeResource(uri, transport);
      break;
    case 'schema://health':
      await this.fetchHealthSchemaResource(uri, transport);
      break;
    case 'examples://health':
      await this.fetchHealthExamplesResource(uri, transport);
      break;
    default:
      transport.send({
        error: {
          code: -32601,
          message: `Unknown resource URI: ${uri}`,
          data: {
            supportedSchemes: ['doc://', 'schema://', 'examples://', 'rules://', 'config://'],
            availableResources: ['doc://openapi', 'doc://readme', 'schema://health', 'examples://health'],
          },
        },
      });
  }
}
```

### Content Types
- **OpenAPI Specs**: Full OpenAPI 3.0 specification with all endpoints
- **Documentation**: Markdown content with setup and usage guides
- **Schemas**: JSON Schema definitions for validation
- **Examples**: Sample requests and responses
- **Rules**: Business logic and validation constraints

## Adding New Resources

To add new semantic resources, extend the resource list with appropriate URI schemes:

```typescript
// Add new documentation resource
{
  uri: 'doc://changelog',
  name: 'API Changelog',
  description: 'Version history and breaking changes',
  mimeType: 'text/markdown',
}

// Add new schema resource
{
  uri: 'schema://user',
  name: 'User Schema',
  description: 'JSON schema for user objects',
  mimeType: 'application/json',
}

// Add new examples resource
{
  uri: 'examples://auth',
  name: 'Authentication Examples',
  description: 'Login and token usage examples',
  mimeType: 'application/json',
}

// Add new rules resource
{
  uri: 'rules://permissions',
  name: 'Permission Rules',
  description: 'User permission and access control rules',
  mimeType: 'application/json',
}
```

Then implement the corresponding handlers in `handleResourcesRead()`.

## Migration from Legacy URIs

### Legacy URI Mapping

| Legacy URI | New Semantic URI | Status |
|------------|------------------|--------|
| `swagger://api-docs/project/swagger/specs` | `doc://openapi` | ✅ Migrated |
| `swagger://api-docs/project/swagger/ui` | `doc://readme` | ✅ Migrated |

### Migration Steps

1. **Update Resource Lists**: Replace legacy URIs with semantic URIs
2. **Update Handlers**: Implement new URI handlers
3. **Update Tests**: Modify test scripts to use new URIs
4. **Update Documentation**: Update all examples and guides
5. **Deprecation Notice**: Add warnings for legacy URI usage

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