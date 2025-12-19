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

## Database Configuration

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

### Other Database Variables

When `DB_CHECK=true`, the following environment variables are required:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DB_HOST` | string | 'localhost' | Database host address |
| `DB_PORT` | number | 5432 | Database port number |
| `DB_USERNAME` | string | 'postgres' | Database username |
| `DB_PASSWORD` | string | 'password' | Database password |
| `DB_DATABASE` | string | 'postgis' | Database name |
| `DB_SSL` | boolean | false | Enable SSL connection |
| `DB_POOL_MIN` | number | 2 | Minimum pool connections |
| `DB_POOL_MAX` | number | 10 | Maximum pool connections |
| `DB_CONNECTION_TIMEOUT` | number | 30000 | Connection timeout (ms) |
| `DB_IDLE_TIMEOUT` | number | 30000 | Idle timeout (ms) |
| `DB_RETRY_ATTEMPTS` | number | 6 | Connection retry attempts |
| `DB_RETRY_DELAY` | number | 10000 | Delay between retries (ms) |

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
| `DB_CHECK` | boolean | false | Enable database connection check |

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

# Database Configuration
DB_CHECK=false
```