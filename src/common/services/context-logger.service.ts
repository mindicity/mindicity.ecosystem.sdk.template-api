import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

import { ContextUtil } from '../utils/context.util';

/**
 * Log metadata interface for type safety
 */
interface LogMetadata {
  [key: string]: unknown;
  serviceContext?: string;
}

/**
 * Pino logger instance interface
 */
interface PinoLoggerInstance {
  trace(data: LogMetadata, message: string): void;
  debug(data: LogMetadata, message: string): void;
  info(data: LogMetadata, message: string): void;
  warn(data: LogMetadata, message: string): void;
  error(data: LogMetadata, message: string): void;
  fatal(data: LogMetadata, message: string): void;
}

/**
 * Enhanced Pino Logger service that automatically includes correlation ID and user ID
 * from the current request context for all log messages.
 *
 * This service should be used for all non-HTTP logging (business logic, services, etc.)
 * and will automatically format logs as [correlationId](userId) message.
 */
@Injectable()
export class ContextLoggerService {
  private contextName: string = 'Unknown';

  /**
   * Creates a new ContextLoggerService instance.
   *
   * @param logger - Injected Pino logger instance
   * @param configService - Configuration service for accessing app settings
   */
  constructor(
    @InjectPinoLogger()
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sets the context name for this logger instance.
   * Should be called in service constructors.
   *
   * @param context - The context name (usually the class name)
   */
  setContext(context: string): void {
    this.contextName = context;
    this.logger.setContext(context);
  }

  /**
   * Logs a trace message with automatic correlation context.
   * Use for method entry/exit and detailed debugging.
   *
   * @param message - The log message
   * @param meta - Optional metadata object
   */
  trace(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.trace(logData, message);
  }

  /**
   * Logs a debug message with automatic correlation context.
   * Use for detailed debugging information.
   *
   * @param message - The log message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.debug(logData, message);
  }

  /**
   * Logs an info message with automatic correlation context.
   * Use for general application flow information.
   *
   * @param message - The log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.info(logData, message);
  }

  /**
   * Logs a warning message with automatic correlation context.
   * Use for non-blocking issues and warnings.
   *
   * @param message - The log message
   * @param meta - Optional metadata object
   */
  warn(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.warn(logData, message);
  }

  /**
   * Logs an error message with automatic correlation context.
   * Use for exceptions and error conditions.
   *
   * @param message - The log message
   * @param meta - Optional metadata object (can include 'err' for error objects)
   */
  error(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.error(logData, message);
  }

  /**
   * Logs a fatal message with automatic correlation context.
   * Use for critical system errors that may cause application shutdown.
   *
   * @param message - The log message
   * @param meta - Optional metadata object
   */
  fatal(message: string, meta?: LogMetadata): void {
    const contextLogger = this.getContextLogger();
    const logData = this.buildLogData(meta);
    contextLogger.fatal(logData, message);
  }

  /**
   * Builds log data object with context and optional metadata.
   * Always includes the context name for all log messages.
   *
   * @param meta - Optional metadata to include
   * @returns Log data object with context and metadata
   */
  private buildLogData(meta?: LogMetadata): LogMetadata {
    const baseData = {
      context: this.contextName,
    };

    // If metadata is provided, merge it with the base data
    if (meta && Object.keys(meta).length > 0) {
      return {
        ...baseData,
        ...meta,
      };
    }

    return baseData;
  }

  /**
   * Gets a child logger with current correlation context.
   * This ensures correlation ID and user ID are available for message formatting
   * without showing them as structured data in simple messages.
   *
   * @returns Pino logger instance with correlation context
   */
  private getContextLogger(): PinoLoggerInstance {
    const correlationId = ContextUtil.getCorrelationId();
    const userId = ContextUtil.getUserId();

    // Access the underlying Pino logger instance and create a child
    // This makes correlationId and userId available for message formatting
    // but they won't appear as JSON data unless explicitly included in metadata
    const pinoInstance = (this.logger as PinoLogger & { logger?: unknown }).logger || this.logger;
    return pinoInstance.child({
      correlationId,
      userId,
    });
  }

  /**
   * Creates a child logger with additional permanent context.
   * Useful for adding service-specific or operation-specific context.
   *
   * @param additionalContext - Additional context to include in all logs
   * @returns New ContextLoggerService instance with additional context
   */
  child(additionalContext: LogMetadata): ContextLoggerService {
    const childService = new ContextLoggerService(this.logger, this.configService);
    // Set the context from the additional context if provided
    if (additionalContext.serviceContext && typeof additionalContext.serviceContext === 'string') {
      childService.setContext(additionalContext.serviceContext);
    }
    return childService;
  }
}
