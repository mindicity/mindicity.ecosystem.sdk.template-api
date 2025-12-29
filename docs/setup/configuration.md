# Configuration Guide

This document describes the configuration system used in the NestJS Template API application.

## Overview

The application uses a robust configuration management system built on:

- **Environment Variables**: Configuration values loaded from `.env` file or system environment
- **Zod Validation**: Runtime validation and type coercion of configuration values
- **NestJS ConfigModule**: Integration with NestJS dependency injection system
- **Type Safety**: Automatically generated TypeScript types from Zod schemas

## Configuration Files

### App Configuration (`src/config/app.config.ts`)

Manages core application settings including server configuration, security, and API behavior.

```typescript
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

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

export type AppConfig = z.infer<typeof AppConfigSchema>;
```

### Log Configuration (`src/config/log.config.ts`)

Manages logging behavior including levels, formatting, and transport configuration.

```typescript
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const LogConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'alert']).default('debug'),
  timezone: z.string().default('Europe/Rome'),
  transports: z.string().default('console'),
  prefix: z.string().default('api_'),
  truncate: z.coerce.number().default(-1),
  prettyPrint: z.coerce.boolean().default(true),
});

export type LogConfig = z.infer<typeof LogConfigSchema>;
```

## Environment Variables

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_PORT` | number | 3232 | Server port (1-65535) |
| `APP_API_PREFIX` | string | '/mcapi' | API route prefix |
| `APP_API_SCOPE_PREFIX` | string | '' | Additional scope prefix |

### Security Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_CORS_ENABLED` | boolean | true | Enable CORS middleware |
| `APP_BODYPARSER_LIMIT` | string | '20MB' | Maximum request body size |
| `APP_ENABLE_COMPRESSION` | boolean | true | Enable gzip compression |

### Error Handling Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_ERR_DETAIL` | boolean | false | Include detailed error information |
| `APP_ERR_MESSAGE` | boolean | false | Include error messages in responses |

### Logging Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_LOG_LEVEL` | enum | 'debug' | Log level (trace, debug, info, warn, error, alert) |
| `APP_LOG_TIMEZONE` | string | 'Europe/Rome' | Timezone for log timestamps |
| `APP_LOG_TRANSPORTS` | string | 'console' | Log transport method |
| `APP_LOG_PREFIX` | string | 'api_' | Log message prefix |
| `APP_LOG_TRUNCATE` | number | -1 | Log truncation length (-1 for no truncation) |


### Documentation Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `APP_SWAGGER_HOSTNAME` | string | 'http://localhost:3232' | Swagger documentation hostname |

## Usage in Code

### Accessing Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, LogConfig } from '../config';

@Injectable()
export class ExampleService {
  constructor(private configService: ConfigService) {}

  getServerInfo() {
    // Type-safe access to configuration
    const appConfig = this.configService.get<AppConfig>('app');
    const logConfig = this.configService.get<LogConfig>('log');
    
    return {
      port: appConfig.port,
      apiPrefix: appConfig.apiPrefix,
      logLevel: logConfig.level,
    };
  }
}
```

### Configuration in Modules

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import logConfig from './config/log.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, logConfig],
      envFilePath: '.env',
      validate: (config) => {
        // Validation happens automatically via Zod schemas
        return config;
      },
    }),
  ],
})
export class AppModule {}
```

## Validation and Error Handling

### Validation Process

1. **Environment Loading**: Variables loaded from `.env` file or system environment
2. **Schema Validation**: Zod schemas validate and transform values
3. **Type Coercion**: Automatic conversion (e.g., "true" → true, "3232" → 3232)
4. **Default Application**: Missing values use schema defaults
5. **Error Reporting**: Invalid values generate detailed error messages

### Example Validation Errors

```bash
# Invalid port number
APP_PORT=99999
# Error: Number must be less than or equal to 65535

# Invalid log level
APP_LOG_LEVEL=invalid
# Error: Invalid enum value. Expected 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'alert'

# Invalid boolean
APP_CORS_ENABLED=maybe
# Error: Expected boolean, received string
```

### Handling Validation Failures

When configuration validation fails, the application will:

1. Log detailed error messages showing which variables are invalid
2. Exit with status code 1 to prevent startup with invalid configuration
3. Provide clear guidance on expected values and formats

## Best Practices

### Environment Files

1. **Never commit `.env` files** to version control
2. **Use `.env.example`** to document required variables
3. **Set production values** via deployment environment, not files
4. **Use different `.env` files** for different environments

### Configuration Design

1. **Provide sensible defaults** for all non-sensitive configuration
2. **Use descriptive variable names** with consistent prefixes
3. **Group related configuration** in separate config files
4. **Document all configuration options** with comments and types
5. **Validate early** to catch configuration errors at startup

### Security Considerations

1. **Never log sensitive configuration** values
2. **Use separate variables** for different environments
3. **Validate input ranges** to prevent security issues
4. **Use environment-specific defaults** when appropriate

## Troubleshooting

### Common Issues

**Configuration not loading:**
- Check `.env` file exists and is readable
- Verify environment variable names match exactly
- Ensure no extra spaces around values

**Validation errors:**
- Check data types match expected formats
- Verify enum values are exactly as specified
- Ensure numeric values are within valid ranges

**Type errors in code:**
- Import configuration types from config files
- Use `ConfigService.get<Type>()` with proper typing
- Ensure configuration is loaded before use

### Debug Configuration

```typescript
// Add to main.ts for debugging
const configService = app.get(ConfigService);
console.log('App Config:', configService.get('app'));
console.log('Log Config:', configService.get('log'));
```

## Migration Guide

### From Manual Configuration

If migrating from manual environment variable parsing:

1. **Replace manual parsing** with Zod schemas
2. **Add type definitions** using `z.infer<typeof Schema>`
3. **Update imports** to use typed configuration
4. **Add validation** for all configuration values
5. **Test thoroughly** with various environment configurations

### Adding New Configuration

1. **Update Zod schema** with new fields
2. **Add environment variable** to `.env.example`
3. **Document the variable** in this guide
4. **Add tests** for the new configuration
5. **Update TypeScript types** automatically via `z.infer`