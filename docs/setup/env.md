# Environment Variables Documentation

This document provides comprehensive information about all environment variables used in the NestJS Template API application.

## Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
- [Server Configuration](#server-configuration)
- [Security Configuration](#security-configuration)
- [Logging Configuration](#logging-configuration)
- [Error Handling Configuration](#error-handling-configuration)
- [Documentation Configuration](#documentation-configuration)
- [MCP Configuration](#mcp-configuration)
- [Database Configuration](#database-configuration)
- [Environment-Specific Settings](#environment-specific-settings)
- [Validation and Defaults](#validation-and-defaults)
- [Best Practices](#best-practices)

## Overview

The NestJS Template API uses environment variables for configuration management with the following features:

- **Zod Validation**: All environment variables are validated using Zod schemas
- **Type Safety**: TypeScript types are automatically generated from schemas
- **Default Values**: Sensible defaults for all configuration options
- **Environment Files**: Support for `.env` files and system environment variables
- **Runtime Validation**: Configuration is validated at application startup

## Configuration Files

### Environment File Locations

| File | Purpose | Priority |
|------|---------|----------|
| `.env` | Default environment variables | Lowest |
| `.env.local` | Local overrides (git-ignored) | Medium |
| `.env.development` | Development-specific settings | High |
| `.env.production` | Production-specific settings | High |
| System Environment | System-level variables | Highest |

### Loading Order

Environment variables are loaded in the following order (later values override earlier ones):

1. `.env` file
2. `.env.local` file
3. `.env.{NODE_ENV}` file
4. System environment variables

## Server Configuration

### APP_PORT

**Description**: Port number for the HTTP server

- **Type**: `number`
- **Default**: `3232`
- **Validation**: Integer between 1 and 65535
- **Example**: `APP_PORT=3232`

```bash
# Development
APP_PORT=3232

# Production
APP_PORT=8080
```

### APP_API_PREFIX

**Description**: Global API prefix for all routes

- **Type**: `string`
- **Default**: `/mcapi`
- **Validation**: Must start with `/`
- **Example**: `APP_API_PREFIX=/mcapi`

```bash
# Standard configuration
APP_API_PREFIX=/mcapi

# Custom prefix
APP_API_PREFIX=/api/v1
```

### APP_API_SCOPE_PREFIX

**Description**: Additional scope prefix for API routes

- **Type**: `string`
- **Default**: `` (empty string)
- **Validation**: String, can be empty
- **Example**: `APP_API_SCOPE_PREFIX=/internal`

```bash
# No scope prefix (default)
APP_API_SCOPE_PREFIX=

# With scope prefix
APP_API_SCOPE_PREFIX=/internal
```

**Final URL Structure**: `{APP_API_PREFIX}{APP_API_SCOPE_PREFIX}/endpoint`

Examples:
- Default: `/mcapi/health/ping`
- With scope: `/mcapi/internal/health/ping`

## Security Configuration

### APP_CORS_ENABLED

**Description**: Enable Cross-Origin Resource Sharing (CORS)

- **Type**: `boolean`
- **Default**: `true`
- **Validation**: Boolean value
- **Example**: `APP_CORS_ENABLED=true`

```bash
# Enable CORS (recommended for development)
APP_CORS_ENABLED=true

# Disable CORS (use with reverse proxy)
APP_CORS_ENABLED=false
```

### APP_BODYPARSER_LIMIT

**Description**: Maximum request body size

- **Type**: `string`
- **Default**: `20MB`
- **Validation**: Valid size string (KB, MB, GB)
- **Example**: `APP_BODYPARSER_LIMIT=20MB`

```bash
# Standard limit
APP_BODYPARSER_LIMIT=20MB

# Smaller limit for APIs
APP_BODYPARSER_LIMIT=1MB

# Larger limit for file uploads
APP_BODYPARSER_LIMIT=100MB
```

### APP_ENABLE_COMPRESSION

**Description**: Enable gzip compression for responses

- **Type**: `boolean`
- **Default**: `true`
- **Validation**: Boolean value
- **Example**: `APP_ENABLE_COMPRESSION=true`

```bash
# Enable compression (recommended)
APP_ENABLE_COMPRESSION=true

# Disable compression
APP_ENABLE_COMPRESSION=false
```

## Logging Configuration

### APP_LOG_LEVEL

**Description**: Minimum log level to output

- **Type**: `enum`
- **Default**: `debug`
- **Options**: `trace`, `debug`, `info`, `warn`, `error`, `alert`
- **Example**: `APP_LOG_LEVEL=debug`

```bash
# Development (verbose logging)
APP_LOG_LEVEL=debug

# Production (essential logs only)
APP_LOG_LEVEL=info

# Troubleshooting (maximum verbosity)
APP_LOG_LEVEL=trace
```

**Log Level Hierarchy**:
```
trace > debug > info > warn > error > alert
```

### APP_LOG_TIMEZONE

**Description**: Timezone for log timestamps

- **Type**: `string`
- **Default**: `Europe/Rome`
- **Validation**: Valid timezone identifier
- **Example**: `APP_LOG_TIMEZONE=Europe/Rome`

```bash
# European timezone
APP_LOG_TIMEZONE=Europe/Rome

# UTC timezone
APP_LOG_TIMEZONE=UTC

# US Eastern timezone
APP_LOG_TIMEZONE=America/New_York
```

### APP_LOG_TRANSPORTS

**Description**: Log output destinations

- **Type**: `string`
- **Default**: `console`
- **Options**: `console`, `file`, `console,file`
- **Example**: `APP_LOG_TRANSPORTS=console`

```bash
# Console only (development)
APP_LOG_TRANSPORTS=console

# File only (production)
APP_LOG_TRANSPORTS=file

# Both console and file
APP_LOG_TRANSPORTS=console,file
```

### APP_LOG_PREFIX

**Description**: Prefix for log entries

- **Type**: `string`
- **Default**: `api_`
- **Validation**: String value
- **Example**: `APP_LOG_PREFIX=api_`

```bash
# Standard prefix
APP_LOG_PREFIX=api_

# Service-specific prefix
APP_LOG_PREFIX=nestjs_template_

# No prefix
APP_LOG_PREFIX=
```

### APP_LOG_TRUNCATE

**Description**: Maximum log message length (-1 for no truncation)

- **Type**: `number`
- **Default**: `-1`
- **Validation**: Integer, -1 for unlimited
- **Example**: `APP_LOG_TRUNCATE=-1`

```bash
# No truncation (default)
APP_LOG_TRUNCATE=-1

# Truncate at 1000 characters
APP_LOG_TRUNCATE=1000

# Truncate at 500 characters
APP_LOG_TRUNCATE=500
```



**Output Examples**:

Pretty Print (Development):
```
2025-12-11T14:30:45+01:00 INFO [api_health] 12345678-1234-1234-1234-123456789012 - Health check requested
```

JSON Format (Production):
```json
{"@timestamp":"2025-12-11T14:30:45.690Z","level":"info","requestId":"12345678-1234-1234-1234-123456789012","message":"Health check requested","context":"HealthController"}
```

## Error Handling Configuration

### APP_ERR_DETAIL

**Description**: Include detailed error information in responses

- **Type**: `boolean`
- **Default**: `false`
- **Validation**: Boolean value
- **Example**: `APP_ERR_DETAIL=false`

```bash
# Hide error details (production)
APP_ERR_DETAIL=false

# Show error details (development)
APP_ERR_DETAIL=true
```

**Impact on Error Responses**:

With `APP_ERR_DETAIL=false`:
```json
{
  "id": "uuid",
  "status": 500,
  "type": "InternalServerError",
  "errcode": "app-00500",
  "message": "An error occurred"
}
```

With `APP_ERR_DETAIL=true`:
```json
{
  "id": "uuid",
  "status": 500,
  "type": "InternalServerError",
  "errcode": "app-00500",
  "message": "An error occurred",
  "detail": {
    "message": "Detailed error description",
    "stack": [...]
  }
}
```

### APP_ERR_MESSAGE

**Description**: Include detailed error messages in responses

- **Type**: `boolean`
- **Default**: `false`
- **Validation**: Boolean value
- **Example**: `APP_ERR_MESSAGE=false`

```bash
# Generic error messages (production)
APP_ERR_MESSAGE=false

# Detailed error messages (development)
APP_ERR_MESSAGE=true
```

## Documentation Configuration

### APP_SWAGGER_HOSTNAME

**Description**: Base hostname for Swagger documentation

- **Type**: `string`
- **Default**: `http://localhost:3232`
- **Validation**: Valid URL format
- **Example**: `APP_SWAGGER_HOSTNAME=http://localhost:3232`

```bash
# Development
APP_SWAGGER_HOSTNAME=http://localhost:3232

# Staging
APP_SWAGGER_HOSTNAME=https://api-staging.example.com

# Production
APP_SWAGGER_HOSTNAME=https://api.example.com
```

## MCP Configuration

The Model Context Protocol (MCP) enables AI agents to interact with the API through structured tools and resources. MCP provides a standardized way for AI agents to:

- **Execute API operations** through tools (HTTP endpoints)
- **Access API documentation** through resources (OpenAPI specs)
- **Understand API capabilities** through comprehensive tool definitions

### MCP_ENABLED

**Description**: Enable or disable the MCP server

- **Type**: `boolean`
- **Default**: `true`
- **Validation**: Boolean value
- **Example**: `MCP_ENABLED=true`

```bash
# Enable MCP server (recommended)
MCP_ENABLED=true

# Disable MCP server (for testing without AI agent integration)
MCP_ENABLED=false
```

**Impact on Application**:

With `MCP_ENABLED=true`:
- MCP server starts automatically with the application
- AI agents can connect and use tools/resources
- Additional port is opened for MCP communication
- Tools and resources are dynamically generated from API endpoints

With `MCP_ENABLED=false`:
- No MCP server is started
- AI agents cannot connect to the API
- No additional ports are opened
- Application runs normally without MCP functionality

### MCP_TRANSPORT

**Description**: Transport protocol for MCP communication

- **Type**: `enum`
- **Default**: `http`
- **Options**: `http`, `sse`
- **Validation**: Must be one of the allowed values
- **Example**: `MCP_TRANSPORT=http`

```bash
# HTTP transport (recommended - full functionality)
MCP_TRANSPORT=http

# Server-Sent Events transport (basic connectivity only)
MCP_TRANSPORT=sse
```

**Transport Comparison**:

| Transport | Functionality | Use Case | Recommendation |
|-----------|---------------|----------|----------------|
| `http` | Complete tools and resources | Production, development, full AI integration | ✅ **Recommended** |
| `sse` | Basic connectivity only | Limited use cases, real-time scenarios | ⚠️ **Limited** |

**Important**: Invalid transport values will default to `http` with a warning message.

### MCP_PORT

**Description**: Port number for MCP server communication

- **Type**: `number`
- **Default**: `3235`
- **Validation**: Integer between 1 and 65535
- **Example**: `MCP_PORT=3235`

```bash
# Default MCP port
MCP_PORT=3235

# Custom MCP port (avoid conflicts)
MCP_PORT=4000

# Production MCP port
MCP_PORT=8235
```

**Port Selection Guidelines**:
- Choose a port different from your main API port (`APP_PORT`)
- Ensure the port is not used by other services
- Use consistent ports across environments for easier configuration
- Common MCP ports: 3235, 4235, 8235

**Validation**: Invalid port values will cause application startup failure with clear error messages.

### MCP_HOST

**Description**: Host address for MCP server binding

- **Type**: `string`
- **Default**: `localhost`
- **Validation**: Cannot be empty
- **Example**: `MCP_HOST=localhost`

```bash
# Local development (default)
MCP_HOST=localhost

# Bind to all interfaces (production)
MCP_HOST=0.0.0.0

# Specific interface
MCP_HOST=192.168.1.100
```

**Security Considerations**:
- Use `localhost` for development to restrict access
- Use `0.0.0.0` in production with proper firewall rules
- Never expose MCP ports directly to the internet without authentication

### MCP_SERVER_NAME

**Description**: Identifier name for the MCP server

- **Type**: `string`
- **Default**: Package name from `package.json` or `mindicity-api-template`
- **Validation**: Cannot be empty
- **Example**: `MCP_SERVER_NAME=user-management-api`

```bash
# Automatic from package.json (recommended)
# MCP_SERVER_NAME=  # Leave empty to use package.json name

# Custom server name
MCP_SERVER_NAME=user-management-api

# Environment-specific naming
MCP_SERVER_NAME=api-staging
```

**Naming Guidelines**:
- Use descriptive names that identify the API purpose
- Include environment suffix for staging/production
- Keep names consistent with your API naming conventions
- Avoid spaces and special characters

### MCP_SERVER_VERSION

**Description**: Version identifier for the MCP server

- **Type**: `string`
- **Default**: Version from `package.json` or `1.0.0`
- **Validation**: Cannot be empty
- **Example**: `MCP_SERVER_VERSION=1.2.3`

```bash
# Automatic from package.json (recommended)
# MCP_SERVER_VERSION=  # Leave empty to use package.json version

# Custom version
MCP_SERVER_VERSION=1.2.3

# Development version
MCP_SERVER_VERSION=1.0.0-dev
```

**Version Management**:
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Keep versions synchronized with your API versions
- Update versions when MCP tools or resources change
- Use development suffixes for non-production environments

### MCP Configuration Examples

**Development Environment**:
```bash
# Full MCP functionality for development
MCP_ENABLED=true
MCP_TRANSPORT=http
MCP_PORT=3235
MCP_HOST=localhost
# MCP_SERVER_NAME=  # Use package.json name
# MCP_SERVER_VERSION=  # Use package.json version
```

**Production Environment**:
```bash
# Production MCP configuration
MCP_ENABLED=true
MCP_TRANSPORT=http
MCP_PORT=8235
MCP_HOST=0.0.0.0
MCP_SERVER_NAME=user-management-api-prod
MCP_SERVER_VERSION=1.0.0
```

**Testing Environment**:
```bash
# Disable MCP for unit tests
MCP_ENABLED=false
# Other MCP variables not needed when disabled
```

### MCP Validation and Error Handling

The MCP configuration is validated at application startup with comprehensive error messages:

**Validation Rules**:
- `MCP_TRANSPORT`: Only `http` and `sse` are allowed
- `MCP_PORT`: Must be between 1 and 65535 (inclusive)
- `MCP_HOST`: Cannot be empty string
- `MCP_SERVER_NAME`: Cannot be empty string
- `MCP_SERVER_VERSION`: Cannot be empty string

**Error Examples**:
```bash
# Invalid transport
❌ MCP Configuration validation failed: transport: Invalid enum value. Expected 'http' | 'sse', received 'invalid'

# Invalid port
❌ MCP Configuration validation failed: port: MCP port must be at least 1

# Empty host
❌ MCP Configuration validation failed: host: MCP host cannot be empty
```

**Startup Behavior**:
- Invalid configurations cause application startup failure
- Clear error messages show exactly what needs to be fixed
- Validation errors include allowed values and examples
- Application will not start until all MCP configuration is valid

### MCP Tools and Resources

When MCP is enabled, the server automatically provides:

**Tools** (API Operations):
- `get_api_health`: Check server health and status
- Future tools are added automatically as modules are created
- Each tool corresponds to an API endpoint
- Tools include comprehensive descriptions and usage guidance

**Resources** (API Documentation):
- `doc://openapi/specs`: Complete OpenAPI specification
- Dynamic resource generation from actual API documentation
- Resources provide AI agents with API structure understanding
- Automatically updated when API changes

**AI Agent Integration**:
```typescript
// AI agents can discover and use tools
const tools = await mcpClient.listTools();
// Returns: [{ name: 'get_api_health', description: '...', inputSchema: {...} }]

const result = await mcpClient.callTool('get_api_health', {});
// Returns: { content: [{ type: 'text', text: '{"status":"healthy",...}' }] }

const resources = await mcpClient.listResources();
// Returns: [{ uri: 'doc://openapi/specs', name: 'API Documentation', ... }]
```

## Database Configuration

The application supports PostgreSQL database connectivity with comprehensive configuration options for connection management, pooling, and retry logic.

### DB_CHECK

**Description**: Enable database connection check at startup

- **Type**: `boolean`
- **Default**: `false`
- **Validation**: Boolean value
- **Example**: `DB_CHECK=false`

```bash
# Disable database connection (default - for testing/development without DB)
DB_CHECK=false

# Enable database connection (production/development with DB)
DB_CHECK=true
```

**Impact on Application Startup**:

With `DB_CHECK=false`:
- Application starts without attempting database connection
- Database queries will throw `DatabaseException` with helpful error message
- Useful for testing, development without database, or when database is not required

With `DB_CHECK=true`:
- Application attempts to connect to database at startup
- Connection failures will prevent application from starting
- Database queries work normally once connected
- Recommended for production environments

### DB_HOST

**Description**: PostgreSQL database server hostname or IP address

- **Type**: `string`
- **Default**: `localhost`
- **Validation**: Cannot be empty
- **Example**: `DB_HOST=localhost`

```bash
# Local development
DB_HOST=localhost

# Remote database server
DB_HOST=db.example.com

# Docker container
DB_HOST=postgres-container

# IP address
DB_HOST=192.168.1.100
```

### DB_PORT

**Description**: PostgreSQL database server port number

- **Type**: `number`
- **Default**: `5432`
- **Validation**: Integer between 1 and 65535
- **Example**: `DB_PORT=5432`

```bash
# Standard PostgreSQL port
DB_PORT=5432

# Custom port
DB_PORT=5433

# Docker mapped port
DB_PORT=54320
```

### DB_USERNAME

**Description**: Database username for authentication

- **Type**: `string`
- **Default**: `postgres`
- **Validation**: Cannot be empty
- **Example**: `DB_USERNAME=api_user`

```bash
# Default PostgreSQL user
DB_USERNAME=postgres

# Application-specific user
DB_USERNAME=api_user

# Environment-specific user
DB_USERNAME=prod_api_user
```

**Security Best Practices**:
- Create dedicated database users for applications
- Use least-privilege principle (only required permissions)
- Avoid using superuser accounts in production
- Use different users for different environments

### DB_PASSWORD

**Description**: Database password for authentication

- **Type**: `string`
- **Default**: `password`
- **Validation**: Cannot be empty
- **Example**: `DB_PASSWORD=secure_password_123`

```bash
# Development (simple password)
DB_PASSWORD=password

# Production (strong password)
DB_PASSWORD=SecureP@ssw0rd!2024

# Environment variable reference
DB_PASSWORD=${DATABASE_PASSWORD}
```

**Security Best Practices**:
- Use strong, unique passwords for each environment
- Store passwords in secure secret management systems
- Never commit passwords to version control
- Rotate passwords regularly
- Use environment-specific passwords

### DB_DATABASE

**Description**: Name of the PostgreSQL database to connect to

- **Type**: `string`
- **Default**: `postgis`
- **Validation**: Cannot be empty
- **Example**: `DB_DATABASE=api_database`

```bash
# Default database with PostGIS support
DB_DATABASE=postgis

# Application-specific database
DB_DATABASE=user_management_db

# Environment-specific database
DB_DATABASE=api_production
```

### DB_SSL

**Description**: Enable SSL/TLS encryption for database connections

- **Type**: `boolean`
- **Default**: `false`
- **Validation**: Boolean value
- **Example**: `DB_SSL=true`

```bash
# Disable SSL (local development)
DB_SSL=false

# Enable SSL (production/remote connections)
DB_SSL=true
```

**SSL Configuration Guidelines**:
- Always use SSL for production and remote connections
- Disable SSL only for local development
- Ensure database server supports SSL when enabled
- Consider certificate validation requirements

### Connection Pool Configuration

The application uses connection pooling to efficiently manage database connections and improve performance.

### DB_POOL_MIN

**Description**: Minimum number of connections to maintain in the pool

- **Type**: `number`
- **Default**: `2`
- **Validation**: Integer, minimum 0
- **Example**: `DB_POOL_MIN=2`

```bash
# Small application (default)
DB_POOL_MIN=2

# High-traffic application
DB_POOL_MIN=5

# Single connection for testing
DB_POOL_MIN=1
```

### DB_POOL_MAX

**Description**: Maximum number of connections allowed in the pool

- **Type**: `number`
- **Default**: `10`
- **Validation**: Integer, minimum 1
- **Example**: `DB_POOL_MAX=10`

```bash
# Standard application (default)
DB_POOL_MAX=10

# High-traffic application
DB_POOL_MAX=20

# Resource-constrained environment
DB_POOL_MAX=5
```

**Pool Sizing Guidelines**:
- Start with defaults and monitor performance
- Increase pool size for high-concurrency applications
- Consider database server connection limits
- Monitor connection usage and adjust accordingly

### Timeout Configuration

### DB_CONNECTION_TIMEOUT

**Description**: Maximum time to wait for a database connection (milliseconds)

- **Type**: `number`
- **Default**: `30000` (30 seconds)
- **Validation**: Integer, minimum 1000ms
- **Example**: `DB_CONNECTION_TIMEOUT=30000`

```bash
# Standard timeout (default)
DB_CONNECTION_TIMEOUT=30000

# Shorter timeout for fast-fail
DB_CONNECTION_TIMEOUT=10000

# Longer timeout for slow networks
DB_CONNECTION_TIMEOUT=60000
```

### DB_IDLE_TIMEOUT

**Description**: Maximum time a connection can remain idle before being closed (milliseconds)

- **Type**: `number`
- **Default**: `30000` (30 seconds)
- **Validation**: Integer, minimum 1000ms
- **Example**: `DB_IDLE_TIMEOUT=30000`

```bash
# Standard idle timeout (default)
DB_IDLE_TIMEOUT=30000

# Shorter timeout to free resources quickly
DB_IDLE_TIMEOUT=15000

# Longer timeout for persistent connections
DB_IDLE_TIMEOUT=300000
```

### Retry Configuration

The application includes automatic retry logic for handling temporary database connection failures.

### DB_RETRY_ATTEMPTS

**Description**: Number of connection retry attempts before giving up

- **Type**: `number`
- **Default**: `6`
- **Validation**: Integer, minimum 1
- **Example**: `DB_RETRY_ATTEMPTS=6`

```bash
# Standard retry attempts (default)
DB_RETRY_ATTEMPTS=6

# Fewer retries for fast-fail scenarios
DB_RETRY_ATTEMPTS=3

# More retries for unreliable networks
DB_RETRY_ATTEMPTS=10
```

### DB_RETRY_DELAY

**Description**: Delay between retry attempts (milliseconds)

- **Type**: `number`
- **Default**: `10000` (10 seconds)
- **Validation**: Integer, minimum 1000ms
- **Example**: `DB_RETRY_DELAY=10000`

```bash
# Standard retry delay (default)
DB_RETRY_DELAY=10000

# Shorter delay for faster recovery
DB_RETRY_DELAY=5000

# Longer delay to avoid overwhelming server
DB_RETRY_DELAY=30000
```

**Retry Strategy**:
- Exponential backoff is applied automatically
- First retry: immediate
- Subsequent retries: delay × attempt number
- Maximum delay is capped to prevent excessive waiting

### Database Configuration Examples

**Development Environment**:
```bash
# Local PostgreSQL development setup
DB_CHECK=true
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=api_dev
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=5
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=5000
```

**Production Environment**:
```bash
# Production PostgreSQL setup with SSL
DB_CHECK=true
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_USERNAME=api_prod_user
DB_PASSWORD=${DATABASE_PASSWORD}  # From secret management
DB_DATABASE=api_production
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=60000
DB_RETRY_ATTEMPTS=6
DB_RETRY_DELAY=10000
```

**Testing Environment**:
```bash
# Disable database for unit tests
DB_CHECK=false
# Other DB variables not needed when disabled
```

**Docker Development**:
```bash
# Docker Compose PostgreSQL setup
DB_CHECK=true
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=api_user
DB_PASSWORD=dev_password
DB_DATABASE=api_docker
DB_SSL=false
DB_POOL_MIN=1
DB_POOL_MAX=5
DB_CONNECTION_TIMEOUT=15000
DB_IDLE_TIMEOUT=15000
DB_RETRY_ATTEMPTS=5
DB_RETRY_DELAY=5000
```

### Database Validation and Error Handling

Database configuration is validated at application startup with detailed error messages:

**Validation Rules**:
- All connection parameters (host, username, password, database) cannot be empty
- Port must be between 1 and 65535
- Pool settings: min ≥ 0, max ≥ 1, max ≥ min
- Timeouts must be at least 1000ms (1 second)
- Retry attempts must be at least 1
- Retry delay must be at least 1000ms

**Error Examples**:
```bash
# Missing required fields
❌ Database Configuration validation failed: host: Database host is required

# Invalid port
❌ Database Configuration validation failed: port: Number must be less than or equal to 65535

# Invalid pool configuration
❌ Database Configuration validation failed: poolMax: Number must be greater than or equal to 1
```

### Database Connection Troubleshooting

**Common Connection Issues**:

1. **Connection Refused**:
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Check if port is accessible
   telnet localhost 5432
   ```

2. **Authentication Failed**:
   ```bash
   # Verify credentials
   psql -h localhost -p 5432 -U api_user -d api_database
   
   # Check pg_hba.conf for authentication rules
   ```

3. **Database Does Not Exist**:
   ```bash
   # Create database
   createdb -h localhost -p 5432 -U postgres api_database
   
   # List existing databases
   psql -h localhost -p 5432 -U postgres -l
   ```

4. **SSL Connection Issues**:
   ```bash
   # Test SSL connection
   psql "host=localhost port=5432 dbname=api_database user=api_user sslmode=require"
   
   # Check server SSL configuration
   ```

**Performance Monitoring**:
- Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`
- Check connection pool usage in application logs
- Monitor query performance and connection wait times
- Adjust pool settings based on actual usage patterns

**Security Checklist**:
- [ ] Use strong, unique passwords
- [ ] Enable SSL for production connections
- [ ] Create dedicated database users with minimal privileges
- [ ] Regularly rotate database passwords
- [ ] Monitor database access logs
- [ ] Keep PostgreSQL server updated
- [ ] Configure firewall rules for database access

## Environment-Specific Settings

### Development Environment

Create `.env.development`:

```bash
# Development-specific settings
NODE_ENV=development
APP_PORT=3232
APP_LOG_LEVEL=debug
APP_ERR_DETAIL=true
APP_ERR_MESSAGE=true
APP_CORS_ENABLED=true
APP_SWAGGER_HOSTNAME=http://localhost:3232
```

### Production Environment

Create `.env.production`:

```bash
# Production-specific settings
NODE_ENV=production
APP_PORT=8080
APP_LOG_LEVEL=info
APP_ERR_DETAIL=false
APP_ERR_MESSAGE=false
APP_CORS_ENABLED=false
APP_LOG_TRANSPORTS=file
APP_SWAGGER_HOSTNAME=https://api.example.com
```

### Testing Environment

Create `.env.test`:

```bash
# Test-specific settings
NODE_ENV=test
APP_PORT=0
APP_LOG_LEVEL=error
APP_ERR_DETAIL=true
APP_ERR_MESSAGE=true
```

## Validation and Defaults

### Configuration Schemas

The application uses Zod schemas for validation:

```typescript
// src/config/app.config.ts
const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3232),
  apiPrefix: z.string().default('/mcapi'),
  apiScopePrefix: z.string().default(''),
  corsEnabled: z.coerce.boolean().default(true),
  errDetail: z.coerce.boolean().default(false),
  errMessage: z.coerce.boolean().default(false),
  bodyParserLimit: z.string().default('20MB'),
  enableCompression: z.coerce.boolean().default(true),
  swaggerHostname: z.string().default('http://localhost:3232'),
});

// src/config/log.config.ts
const LogConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'alert']).default('debug'),
  timezone: z.string().default('Europe/Rome'),
  transports: z.string().default('console'),
  prefix: z.string().default('api_'),
  truncate: z.coerce.number().default(-1),
  prettyPrint: z.coerce.boolean().default(true),
});
```

### Validation Errors

If environment variables fail validation, the application will exit with detailed error messages:

```bash
# Example validation error
Configuration validation failed:
- APP_PORT: Expected number, received string "invalid"
- APP_LOG_LEVEL: Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'alert', received 'invalid'
```

### Type Coercion

The configuration system automatically converts string environment variables to appropriate types:

| Environment Value | Coerced Type | Result |
|-------------------|--------------|--------|
| `"3232"` | `number` | `3232` |
| `"true"` | `boolean` | `true` |
| `"false"` | `boolean` | `false` |
| `"1"` | `boolean` | `true` |
| `"0"` | `boolean` | `false` |

## Best Practices

### Security Best Practices

1. **Never commit sensitive values**:
   ```bash
   # Add to .gitignore
   .env.local
   .env.production
   ```

2. **Use different values per environment**:
   ```bash
   # Development
   APP_ERR_DETAIL=true
   
   # Production
   APP_ERR_DETAIL=false
   ```

3. **Validate all configuration**:
   - Use Zod schemas for validation
   - Provide sensible defaults
   - Document all variables

### Development Best Practices

1. **Use .env.example as template**:
   ```bash
   # Copy template for new developers
   cp .env.example .env
   ```

2. **Document all variables**:
   - Include purpose and examples
   - Specify validation rules
   - Provide default values

3. **Environment-specific files**:
   ```bash
   .env                 # Default values
   .env.local          # Local overrides (git-ignored)
   .env.development    # Development settings
   .env.production     # Production settings
   ```

### Production Best Practices

1. **Use system environment variables**:
   ```bash
   # Set in deployment environment
   export APP_PORT=8080
   export APP_LOG_LEVEL=info
   ```

2. **Secure sensitive values**:
   - Use secret management systems
   - Avoid logging sensitive values
   - Rotate secrets regularly

3. **Monitor configuration**:
   - Log configuration loading
   - Validate at startup
   - Alert on configuration errors

### Configuration Management

1. **Centralized configuration**:
   - Keep all config in `src/config/`
   - Use TypeScript interfaces
   - Export typed configuration objects

2. **Configuration validation**:
   ```typescript
   // Validate at startup
   const config = AppConfigSchema.parse(process.env);
   ```

3. **Configuration documentation**:
   - Document all variables
   - Provide examples
   - Explain validation rules

## Troubleshooting

### Common Issues

#### Configuration Not Loading

**Problem**: Environment variables not being read

**Solutions**:
```bash
# Check .env file exists
ls -la .env

# Verify file format (no spaces around =)
cat .env | grep -v "^#" | grep "="

# Test loading
node -e "require('dotenv').config(); console.log(process.env.APP_PORT)"
```

#### Validation Errors

**Problem**: Configuration validation fails

**Solutions**:
```bash
# Check for typos in variable names
grep -n "APP_" .env

# Verify enum values
echo "Valid log levels: trace, debug, info, warn, error, alert"

# Check boolean values
echo "Valid boolean values: true, false, 1, 0"
```

#### Type Conversion Issues

**Problem**: Values not converting to expected types

**Solutions**:
```bash
# Check for extra quotes
grep -n '"' .env

# Verify numeric values
echo $APP_PORT | grep -E '^[0-9]+$'

# Test boolean conversion
node -e "console.log(Boolean('false'))"  # true (string)
node -e "console.log(process.env.APP_CORS_ENABLED === 'false')"  # false
```

### Debug Configuration

Add debug logging to see loaded configuration:

```typescript
// In main.ts or app.module.ts
console.log('Loaded configuration:', {
  port: configService.get('app.port'),
  logLevel: configService.get('log.level'),
  corsEnabled: configService.get('app.corsEnabled'),
});
```

### Environment Variable Checklist

Before deployment, verify:

- [ ] All required variables are set
- [ ] Values pass validation
- [ ] Sensitive values are secured
- [ ] Environment-specific values are correct
- [ ] Configuration loads without errors
- [ ] Application starts successfully

## Reference

### Complete Environment Variable List

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_PORT` | number | 3232 | HTTP server port |
| `APP_API_PREFIX` | string | /mcapi | Global API prefix |
| `APP_API_SCOPE_PREFIX` | string | "" | Additional scope prefix |
| `APP_CORS_ENABLED` | boolean | true | Enable CORS |
| `APP_BODYPARSER_LIMIT` | string | 20MB | Request body size limit |
| `APP_ENABLE_COMPRESSION` | boolean | true | Enable gzip compression |
| `APP_ERR_DETAIL` | boolean | false | Include error details |
| `APP_ERR_MESSAGE` | boolean | false | Include error messages |
| `APP_LOG_LEVEL` | enum | debug | Minimum log level |
| `APP_LOG_TIMEZONE` | string | Europe/Rome | Log timestamp timezone |
| `APP_LOG_TRANSPORTS` | string | console | Log output destinations |
| `APP_LOG_PREFIX` | string | api_ | Log entry prefix |
| `APP_LOG_TRUNCATE` | number | -1 | Log message max length |
| `APP_SWAGGER_HOSTNAME` | string | http://localhost:3232 | Swagger base URL |
| `MCP_ENABLED` | boolean | true | Enable MCP server |
| `MCP_TRANSPORT` | enum | http | MCP transport protocol |
| `MCP_PORT` | number | 3235 | MCP server port |
| `MCP_HOST` | string | localhost | MCP server host |
| `MCP_SERVER_NAME` | string | package.json name | MCP server identifier |
| `MCP_SERVER_VERSION` | string | package.json version | MCP server version |
| `DB_CHECK` | boolean | false | Enable database connection check |
| `DB_HOST` | string | localhost | Database host address |
| `DB_PORT` | number | 5432 | Database port number |
| `DB_USERNAME` | string | postgres | Database username |
| `DB_PASSWORD` | string | password | Database password |
| `DB_DATABASE` | string | postgis | Database name |
| `DB_SSL` | boolean | false | Enable SSL connection |
| `DB_POOL_MIN` | number | 2 | Minimum pool connections |
| `DB_POOL_MAX` | number | 10 | Maximum pool connections |
| `DB_CONNECTION_TIMEOUT` | number | 30000 | Connection timeout (ms) |
| `DB_IDLE_TIMEOUT` | number | 30000 | Idle timeout (ms) |
| `DB_RETRY_ATTEMPTS` | number | 6 | Connection retry attempts |
| `DB_RETRY_DELAY` | number | 10000 | Delay between retries (ms) |

### Example .env File

```bash
# NestJS Template API Configuration

# Server Configuration
APP_PORT=3232
APP_API_PREFIX=/mcapi
APP_API_SCOPE_PREFIX=

# Security Configuration
APP_CORS_ENABLED=true
APP_BODYPARSER_LIMIT=20MB
APP_ENABLE_COMPRESSION=true

# Error Handling Configuration
APP_ERR_DETAIL=false
APP_ERR_MESSAGE=false

# Logging Configuration
APP_LOG_LEVEL=debug
APP_LOG_TIMEZONE=Europe/Rome
APP_LOG_TRANSPORTS=console
APP_LOG_PREFIX=api_
APP_LOG_TRUNCATE=-1

# Documentation Configuration
APP_SWAGGER_HOSTNAME=http://localhost:3232

# MCP Configuration
MCP_ENABLED=true
MCP_TRANSPORT=http
MCP_PORT=3235
MCP_HOST=localhost
# MCP_SERVER_NAME=  # Optional: defaults to package.json name
# MCP_SERVER_VERSION=  # Optional: defaults to package.json version

# Database Configuration
DB_CHECK=false
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=postgis
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000
DB_RETRY_ATTEMPTS=6
DB_RETRY_DELAY=10000
```