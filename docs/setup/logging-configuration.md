# Logging Configuration Guide

This document explains how to configure the logging system in the NestJS application.

## Environment Variables

### Basic Logging Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_LOG_LEVEL` | `debug` | Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `APP_LOG_TRANSPORTS` | `console` | Transport types: `console`, `file`, or `console,file` |
| `APP_LOG_PREFIX` | `api_` | Log file prefix (used for file naming) |


### File Log Rotation Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_LOG_FILE_MAX_SIZE` | `5MB` | Maximum file size before rotation (e.g., `5MB`, `10MB`, `1GB`) |
| `APP_LOG_FILE_FREQUENCY` | `daily` | Rotation frequency: `daily`, `hourly`, `weekly` |

### Context Visibility Control

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `APP_LOG_HTTP_DETAILS` | `basic` | `none`, `basic`, `full` | HTTP request details logging level |

## Configuration Examples

### Development Environment
```bash
# Verbose logging with console output and file rotation
APP_LOG_LEVEL=debug
APP_LOG_TRANSPORTS=console,file
APP_LOG_PREFIX=api_dev
APP_LOG_HTTP_DETAILS=full
APP_LOG_FILE_MAX_SIZE=5MB
APP_LOG_FILE_FREQUENCY=daily
```

**Output:**
```
[2025-12-11 15:40:27.549 +0000] INFO: [9517676e-28e3-40bb-b9da-172a796c795f](anonymous) Processing template request
[2025-12-11 15:40:27.550 +0000] INFO: [9517676e-28e3-40bb-b9da-172a796c795f](anonymous) GET /mcapi/health/ping - 200 [45b](123ms) {"http":{"method":"GET","url":"/mcapi/health/ping","headers":{"user-agent":"curl/7.68.0","authorization":"[REDACTED]"}}}
```

### Production Environment
```bash
# Clean, minimal logging with file rotation
APP_LOG_LEVEL=info
APP_LOG_TRANSPORTS=file
APP_LOG_PREFIX=api_prod
APP_LOG_HTTP_DETAILS=none
APP_LOG_FILE_MAX_SIZE=10MB
APP_LOG_FILE_FREQUENCY=daily
```

**Output:**
```
{"level":30,"time":1702300000000,"correlationId":"abc123","userId":"anonymous","msg":"Processing template request"}
{"level":30,"time":1702300000000,"correlationId":"abc123","userId":"anonymous","msg":"GET /mcapi/health/ping - 200 [45b](123ms)"}
```

### Debug Mode
```bash
# Trace level with basic HTTP details
APP_LOG_LEVEL=trace
APP_LOG_HTTP_DETAILS=basic
```

**Output:**
```
[2025-12-11 15:40:27.549 +0000] TRACE: [9517676e-28e3-40bb-b9da-172a796c795f](anonymous) TemplateService -> processRequest()
[2025-12-11 15:40:27.550 +0000] INFO: [9517676e-28e3-40bb-b9da-172a796c795f](anonymous) Processing template request
[2025-12-11 15:40:27.550 +0000] INFO: [9517676e-28e3-40bb-b9da-172a796c795f](anonymous) GET /mcapi/health/ping - 200 [45b](123ms)
```

## Log Format Examples

### System Logs
```
[2025-12-11 15:40:18.611 +0000] INFO: [system](system) Starting Nest application...
[2025-12-11 15:40:18.611 +0000] INFO: [system](system) ConfigModule dependencies initialized
```

### HTTP Request Logs
```
[2025-12-11 15:40:27.550 +0000] INFO: [correlationId](userId) GET /mcapi/health/ping - 200 [45b](123ms)
```

### Service Logs
```
[2025-12-11 15:40:27.549 +0000] INFO: [correlationId](userId) Processing template request
[2025-12-11 15:40:27.550 +0000] DEBUG: [correlationId](userId) Template processing complete
```

## Context Values

| Context | When Used | Description |
|---------|-----------|-------------|
| `[system](system)` | Application startup, system operations | NestJS framework logs |
| `[correlationId](anonymous)` | HTTP requests without JWT | Unauthenticated requests |
| `[correlationId](userId)` | HTTP requests with JWT | Authenticated requests |

## Usage in Code

### Using ContextLoggerService
```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: ContextLoggerService) {
    this.logger.setContext(UserService.name);
  }

  async findUser(id: string) {
    // Automatically includes [correlationId](userId) based on configuration
    this.logger.trace('UserService -> findUser()');
    this.logger.info('Finding user', { userId: id });
    this.logger.debug('Database query executed', { query: 'SELECT * FROM users' });
  }
}
```

### Manual Context Access
```typescript
import { ContextUtil } from '../common/utils/context.util';

// Get current correlation ID ('system' if outside request context)
const correlationId = ContextUtil.getCorrelationId();

// Get current user ID ('system' if outside request context)
const userId = ContextUtil.getUserId();

// Get formatted log prefix
const prefix = ContextUtil.getLogPrefix(); // "[correlationId](userId)"
```

## Performance Considerations

- **Production**: Use `APP_LOG_SHOW_CONTEXT=never` to reduce log verbosity
- **Debug**: Use `APP_LOG_SHOW_CONTEXT=trace-only` to see context only when needed
- **Development**: Use `APP_LOG_SHOW_CONTEXT=always` for full visibility

## HTTP Details Levels

### `APP_LOG_HTTP_DETAILS=none`
Only basic message with correlation context:
```
[correlationId](userId) GET /mcapi/health/ping - 200 [45b](123ms)
```

### `APP_LOG_HTTP_DETAILS=basic` (Default)
Includes basic HTTP information in structured data:
```json
{
  "correlationId": "abc123",
  "userId": "user-456",
  "http": {
    "method": "GET",
    "url": "/mcapi/health/ping",
    "statusCode": 200,
    "contentLength": 45,
    "duration": 123,
    "userAgent": "curl/7.68.0"
  },
  "msg": "GET /mcapi/health/ping - 200 [45b](123ms)"
}
```

### `APP_LOG_HTTP_DETAILS=full`
Includes complete HTTP request/response details:
```json
{
  "correlationId": "abc123",
  "userId": "user-456",
  "http": {
    "method": "GET",
    "url": "/mcapi/health/ping",
    "statusCode": 200,
    "contentLength": 45,
    "duration": 123,
    "headers": {
      "user-agent": "curl/7.68.0",
      "authorization": "[REDACTED]",
      "x-correlation-id": "abc123"
    },
    "query": {},
    "params": {},
    "ip": "127.0.0.1",
    "userAgent": "curl/7.68.0"
  },
  "response": {
    "headers": {
      "content-type": "application/json",
      "x-correlation-id": "abc123"
    }
  },
  "msg": "GET /mcapi/health/ping - 200 [45b](123ms)"
}
```

## Security Features

- **Header Sanitization**: Sensitive headers like `authorization`, `cookie`, `x-api-key` are automatically redacted
- **Response Sanitization**: Sensitive response headers like `set-cookie` are redacted
- **IP Logging**: Client IP addresses are logged (only in `full` mode)

## File Log Rotation

The application uses `pino-roll` for automatic log file rotation based on size and time intervals.

### Rotation Behavior

- **Size-based**: Files rotate when they exceed `APP_LOG_FILE_MAX_SIZE`
- **Time-based**: Files rotate based on `APP_LOG_FILE_FREQUENCY`
- **File naming**: `{prefix}-YYYY-MM-DD-{sequence}.log`
- **Compression**: Rotated files are automatically compressed with gzip

### Example File Structure
```
logs/
├── api_template.log              # Current log file
├── api_template-2025-12-10.log.gz # Yesterday's log (compressed)
├── api_template-2025-12-09.log.gz # Day before (compressed)
└── api_template-2025-12-08.log.gz # Older log (compressed)
```

### Rotation Configuration Examples

#### High-volume Production
```bash
APP_LOG_FILE_MAX_SIZE=50MB
APP_LOG_FILE_FREQUENCY=hourly
```

#### Standard Production
```bash
APP_LOG_FILE_MAX_SIZE=10MB
APP_LOG_FILE_FREQUENCY=daily
```

#### Development/Testing
```bash
APP_LOG_FILE_MAX_SIZE=5MB
APP_LOG_FILE_FREQUENCY=daily
```

### Transport Types

#### Console Only
```bash
APP_LOG_TRANSPORTS=console
# No file rotation needed
```

#### File Only
```bash
APP_LOG_TRANSPORTS=file
APP_LOG_FILE_MAX_SIZE=10MB
APP_LOG_FILE_FREQUENCY=daily
```

#### Both Console and File
```bash
APP_LOG_TRANSPORTS=console,file
APP_LOG_FILE_MAX_SIZE=10MB # File rotation settings
APP_LOG_FILE_FREQUENCY=daily
```

## Best Practices

1. **Development**: Use `console,file` transports with `full` HTTP details for complete debugging
2. **Staging**: Use `file` transport with `basic` HTTP details and moderate rotation settings
3. **Production**: Use `file` transport with `none` HTTP details and appropriate rotation for volume
4. **Security**: Sensitive headers are automatically redacted in all modes
5. **Consistency**: All logs always include `[correlationId](userId)` format for traceability
6. **Monitoring**: Use structured data for log aggregation and analysis
7. **Disk Space**: Monitor log directory size and adjust rotation settings based on volume
8. **Retention**: Consider implementing log cleanup policies for old rotated files