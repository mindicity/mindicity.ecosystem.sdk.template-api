# API Endpoints Documentation

This document provides detailed information about all available API endpoints in the NestJS Template API.

## Base URL

- **Development**: `http://localhost:3232/mcapi`
- **Production**: `https://your-domain.com/mcapi`

## Authentication

This API does not require authentication at the endpoint level. Authentication is handled by the gateway layer.

### Optional Headers

- `Authorization: Bearer <token>` - JWT token for user identification
- `x-correlation-id` - Request correlation ID (auto-generated if not provided)
- `x-ent-value` - Entity segregation value
- `x-ent-resource` - Entity resource identifier
- `x-ent-ref` - Entity reference

## Health Check Endpoints

### GET /health/ping

Health check endpoint to verify API availability and status.

**Request:**

```http
GET /mcapi/health/ping
```

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

**Status Codes:**

- `200 OK` - Service is healthy
- `500 Internal Server Error` - Service is unhealthy

**Response Schema:**

```typescript
interface HealthResponse {
  status: string;    // Always "ok" for successful responses
  version: string;   // Application version from package.json
}
```

**Example:**

```bash
curl -X GET http://localhost:3232/mcapi/health/ping
```

**Notes:**

- This endpoint is excluded from standard request logging to reduce noise
- Response time should be under 100ms
- Used by monitoring systems and load balancers

## Template Module

The template module serves as a placeholder for new API development. It contains no active endpoints and is designed to be customized during the bootstrap process when creating new APIs from this template.

### Module Structure

- **Controller**: `src/modules/template/template.controller.ts` - Placeholder controller with no endpoints
- **Service**: `src/modules/template/template.service.ts` - Placeholder service with database integration setup
- **Module**: `src/modules/template/template.module.ts` - Module configuration with infrastructure dependencies

### Customization

When using this template to create a new API:

1. The template module will be renamed to match your API name
2. Placeholder endpoints will be replaced with your business logic
3. DTOs and interfaces will be customized for your data models
4. Database queries will be implemented for your specific use cases

## Documentation Endpoints

### GET /docs/swagger/ui

Swagger UI interface for interactive API documentation.

**Request:**
```http
GET /mcapi/docs/swagger/ui
```

**Response:**
- HTML page with Swagger UI interface
- Interactive documentation with try-it-out functionality
- Auto-generated from OpenAPI specifications

**Features:**
- Interactive API testing
- Request/response examples
- Schema documentation
- Authentication support

### GET /docs/swagger/specs

OpenAPI specification in JSON format.

**Request:**
```http
GET /mcapi/docs/swagger/specs
```

**Response:**
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "NestJS Template API",
    "description": "Production-ready NestJS API template with Fastify, Pino logging, and modular architecture",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3232",
      "description": "Local development"
    }
  ],
  "paths": {
    // ... API paths and operations
  },
  "components": {
    // ... Schemas, responses, parameters
  }
}
```

**Usage:**
- Import into API testing tools (Postman, Insomnia)
- Generate client SDKs
- API documentation generation
- Contract testing

## Error Responses

All endpoints may return error responses with the following structure:

### Error Response Format

```json
{
  "id": "42a7edc1-448e-48e6-9752-6344334a2735",
  "instance": "/mcapi/health/ping",
  "status": 500,
  "type": "InternalServerError",
  "errcode": "app-00500",
  "message": "An error occurred",
  "detail": {
    "message": "Detailed error information",
    "stack": [
      {
        "fileName": "user.service.ts",
        "lineNumber": 42,
        "columnNumber": 15,
        "functionName": "findUser",
        "source": "at UserService.findUser (user.service.ts:42:15)"
      }
    ]
  }
}
```

### Error Response Schema

```typescript
interface ErrorResponse {
  id: string;           // Unique error ID (UUID)
  instance: string;     // Request path that caused the error
  status: number;       // HTTP status code
  type: string;         // Error type classification
  errcode: string;      // Application-specific error code
  message: string;      // Human-readable error message
  detail?: {            // Optional detailed information
    message: string;    // Detailed error description
    stack: StackFrame[]; // Stack trace information
  };
}

interface StackFrame {
  fileName: string;     // Source file name
  lineNumber: number;   // Line number in source
  columnNumber: number; // Column number in source
  functionName: string; // Function name
  source: string;       // Original stack trace line
}
```

### Common Error Codes

| HTTP Status | Error Code | Type | Description |
|-------------|------------|------|-------------|
| 400 | app-00400 | ValidationError | Request validation failed |
| 404 | app-00404 | NotFoundError | Resource not found |
| 500 | app-00500 | InternalServerError | Internal server error |
| 500 | db-00002 | DatabaseError | Database connection error |

### Error Detail Configuration

Error detail exposure is controlled by environment variables:

- `APP_ERR_DETAIL=true` - Include detailed error information and stack traces
- `APP_ERR_MESSAGE=true` - Include detailed error messages
- `APP_ERR_DETAIL=false` - Hide sensitive error details (production default)

## Request/Response Headers

### Standard Headers

**Request Headers:**
- `Content-Type: application/json` - For POST/PUT requests
- `Accept: application/json` - Expected response format
- `User-Agent: <client-info>` - Client identification

**Response Headers:**
- `Content-Type: application/json` - Response format
- `x-correlation-id: <uuid>` - Request correlation ID
- `x-response-time: <ms>` - Response time in milliseconds

### Security Headers

The API includes security headers via Helmet middleware:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

## Rate Limiting

Currently, no rate limiting is implemented at the application level. Rate limiting should be handled by:

- API Gateway
- Load balancer
- Reverse proxy (nginx, Apache)

## CORS Configuration

CORS is configurable via environment variables:

- `APP_CORS_ENABLED=true` - Enable CORS support
- Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- Credentials: Supported
- Origin: Configurable (default: allow all)

## Request Size Limits

- **Body Size Limit**: 20MB (configurable via `APP_BODYPARSER_LIMIT`)
- **URL Length**: Standard Fastify limits apply
- **Header Size**: Standard Fastify limits apply

## Content Compression

Response compression is enabled by default:

- `APP_ENABLE_COMPRESSION=true` - Enable gzip compression
- Automatic compression for responses > 1KB
- Supports gzip and deflate encodings

## Monitoring and Observability

### Correlation IDs

Every request receives a correlation ID:

- Auto-generated UUID if not provided
- Included in all log entries
- Returned in response headers
- Used for distributed tracing

### Logging

Request/response logging includes:

- Request method, URL, headers
- Response status code, timing
- User information (if authenticated)
- Correlation ID for tracing

### Health Monitoring

The health endpoint provides:

- Application status
- Version information
- Quick response time check
- Integration with monitoring systems

## Testing the API

### Using curl

```bash
# Health check
curl -X GET http://localhost:3232/mcapi/health/ping
```

### Using HTTPie

```bash
# Health check
http GET localhost:3232/mcapi/health/ping
```

### Using JavaScript/Node.js

```javascript
const axios = require('axios');

// Health check
const healthResponse = await axios.get('http://localhost:3232/mcapi/health/ping');
console.log(healthResponse.data);
```

## API Versioning

Currently, the API does not implement versioning. Future versions should consider:

- URL path versioning: `/mcapi/v1/{module}/{endpoint}`
- Header versioning: `Accept: application/vnd.api+json;version=1`
- Query parameter versioning: `/mcapi/{module}/{endpoint}?version=1`

## Changelog

### Version 1.0.0

- Initial template implementation
- Health check endpoint
- Template module placeholder structure
- Comprehensive error handling
- Swagger documentation
- Security middleware integration
- Database infrastructure setup
