# Log Rotation Implementation with Pino-Roll

This document describes the implementation of file log rotation using `pino-roll` in the NestJS application.

## Overview

The application now supports automatic log file rotation based on:
- **Size**: Files rotate when they exceed the configured size limit (default: 5MB)
- **Frequency**: Files rotate based on time intervals (daily, hourly, weekly)
- **Retention**: Old log files are automatically managed with configurable limits

## Implementation Details

### Dependencies

```bash
npm install pino-roll
```

### Environment Variables

```bash
# File Log Rotation
APP_LOG_FILE_MAX_SIZE=5MB      # Maximum file size before rotation
APP_LOG_FILE_FREQUENCY=daily   # Rotation frequency: daily, hourly, weekly
```

### Configuration Files

#### 1. Log Configuration (`src/config/log.config.ts`)

Added rotation-specific configuration options:

```typescript
const LogConfigSchema = z.object({
  // ... existing options
  /** Maximum file size before rotation (e.g., "5MB", "10MB", "1GB") */
  fileMaxSize: z.string().default('5MB'),
  /** File rotation frequency ("daily", "hourly", "weekly") */
  fileFrequency: z.enum(['daily', 'hourly', 'weekly']).default('daily'),
});
```

#### 2. Pino-Roll Transport Utility (`src/common/utils/pino-roll-transport.util.ts`)

Created a utility to configure pino-roll with proper options:

```typescript
export function createPinoTransportsWithRotation(
  transports: string,
  logConfig: {
    prefix: string;
    prettyPrint: boolean;
    colorize: boolean;
    fileMaxSize: string;
    fileFrequency: string;
  },
): any {
  // ... implementation
  if (transportTypes.includes('file')) {
    targets.push({
      target: 'pino-roll',
      level: 'trace',
      options: {
        file: getLogFilePath(logConfig.prefix),
        frequency: parseFrequency(logConfig.fileFrequency),
        size: parseSizeForPinoRoll(logConfig.fileMaxSize),
        mkdir: true,
        dateFormat: 'yyyyMMdd',
        symlink: false, // Disabled on Windows (requires admin privileges)
        limit: {
          count: 10, // Keep 10 rotated files
          removeOtherLogFiles: false,
        },
      },
    });
  }
}
```

#### 3. App Module Integration (`src/app.module.ts`)

Updated the LoggerModule configuration to use the new transport:

```typescript
LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const logConfig = configService.get('log');
    
    return {
      pinoHttp: {
        level: logConfig.level,
        autoLogging: false,
        transport: createPinoTransportsWithRotation(logConfig.transports, {
          prefix: logConfig.prefix,
          prettyPrint: logConfig.prettyPrint,
          colorize: logConfig.colorize,
          fileMaxSize: logConfig.fileMaxSize,
          fileFrequency: logConfig.fileFrequency,
        }),
        // ... other options
      },
    };
  },
}),
```

## File Naming Convention

Pino-roll uses the "Extension Last Format" for rotated files:

```
logs/
├── api_template.20251212.1.log    # First rotation of the day
├── api_template.20251212.2.log    # Second rotation of the day
├── api_template.20251212.3.log    # Third rotation of the day
└── api_template.20251213.1.log    # Next day's first rotation
```

## Configuration Examples

### Development Environment
```bash
APP_LOG_TRANSPORTS=console,file
APP_LOG_FILE_MAX_SIZE=5MB
APP_LOG_FILE_FREQUENCY=daily
```

### Production Environment
```bash
APP_LOG_TRANSPORTS=file
APP_LOG_FILE_MAX_SIZE=50MB
APP_LOG_FILE_FREQUENCY=hourly
```

### High-Volume Production
```bash
APP_LOG_TRANSPORTS=file
APP_LOG_FILE_MAX_SIZE=100MB
APP_LOG_FILE_FREQUENCY=hourly
```

## Features

### Size-Based Rotation
- Files automatically rotate when they exceed the configured size
- Size can be specified in KB, MB, or GB (e.g., "500KB", "10MB", "1GB")
- Rotation occurs immediately when the size limit is reached

### Time-Based Rotation
- **Daily**: Rotates at midnight each day
- **Hourly**: Rotates at the start of each hour
- **Weekly**: Rotates weekly (every 7 days)

### File Retention
- Configurable retention policy (default: 10 files)
- Automatic cleanup of old log files
- Option to remove files from previous application runs

### Cross-Platform Compatibility
- Symlink creation disabled on Windows (requires admin privileges)
- Works on Linux, macOS, and Windows
- Automatic directory creation

## Testing

### Test Script
A test script is provided to verify log rotation functionality:

```bash
node test-log-rotation-simple.js
```

### Expected Behavior
1. **File Growth**: Log files grow as requests are processed
2. **Size Monitoring**: Script monitors file size approaching the limit
3. **Rotation Detection**: File size drops when rotation occurs
4. **New File Creation**: New files are created with proper naming convention

### Test Results
```
📊 Request 850: Current log file 4970KB
⚠️  File size approaching limit: 4970KB / 5120KB
📊 Request 900: Current log file 93KB  # ← Rotation occurred!
```

## Monitoring and Maintenance

### Log Directory Structure
```bash
# Check current log files
ls -la logs/

# Monitor current log file size
du -h logs/api_template.20251212.*.log

# Count total log files
ls logs/*.log | wc -l
```

### Disk Space Management
- Monitor the `logs/` directory size regularly
- Adjust `APP_LOG_FILE_MAX_SIZE` based on disk space availability
- Consider external log rotation tools for long-term retention
- Set up log shipping to centralized logging systems

### Performance Considerations
- Larger file sizes reduce I/O overhead but increase memory usage
- More frequent rotation provides better time-based organization
- Balance between file size and rotation frequency based on log volume

## Troubleshooting

### Common Issues

#### 1. Permission Errors
```
Error: EPERM: operation not permitted, symlink
```
**Solution**: Symlinks are disabled on Windows. This is expected behavior.

#### 2. Directory Not Found
```
Error: ENOENT: no such file or directory, open 'logs/app.log'
```
**Solution**: The `mkdir: true` option automatically creates the directory.

#### 3. Large File Sizes
If files grow larger than expected, check:
- Log level configuration (trace/debug generates more logs)
- HTTP request logging settings
- Application request volume

### Debugging
Enable debug logging to see rotation events:
```bash
DEBUG=pino-roll node src/main.js
```

## Best Practices

1. **Size Configuration**: Set file size based on disk space and log volume
2. **Frequency Selection**: Use daily for most applications, hourly for high-volume
3. **Retention Policy**: Keep enough files for debugging but manage disk space
4. **Monitoring**: Set up alerts for log directory disk usage
5. **Backup**: Consider backing up rotated log files to external storage
6. **Testing**: Regularly test rotation behavior in staging environments

## Integration with External Tools

### Logrotate (Linux)
For additional control, you can use system logrotate:
```bash
# /etc/logrotate.d/nestjs-app
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Log Shipping
Configure log shippers to send rotated files to centralized logging:
- **Filebeat**: Monitor the logs directory for new files
- **Fluentd**: Use tail input plugin with rotation detection
- **Logstash**: File input with multiline codec support

## Conclusion

The pino-roll implementation provides robust, configurable log rotation with:
- ✅ Size-based and time-based rotation
- ✅ Configurable retention policies
- ✅ Cross-platform compatibility
- ✅ Integration with existing Pino logging
- ✅ Production-ready performance
- ✅ Easy configuration via environment variables

The implementation successfully handles log rotation automatically, ensuring disk space management while maintaining log accessibility for debugging and monitoring.