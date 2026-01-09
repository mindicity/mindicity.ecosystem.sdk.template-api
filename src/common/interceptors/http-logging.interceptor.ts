import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FastifyRequest, FastifyReply } from 'fastify';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { ContextUtil, RequestContext } from '../utils/context.util';
import { extractUserIdFromJWT, extractCorrelationId, extractUserFromJWT } from '../utils/jwt.util';

/**
 * HTTP Logging Interceptor that provides consistent log formatting for all HTTP requests.
 *
 * Logs in format: [correlationId](userId) HTTP_METHOD /path - STATUS_CODE [SIZE](DURATION)
 *
 * Examples:
 * - [495e99a6-f8b1-405d-9c2d-0ab6610d2404](user-123) GET /mcapi/hello - 200 [45b](123ms)
 * - [495e99a6-f8b1-405d-9c2d-0ab6610d2404](anonymous) POST /mcapi/users - 404 [128b](89ms)
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  /**
   * Creates an instance of HttpLoggingInterceptor.
   * @param logger - The Pino logger instance for logging HTTP requests
   * @param configService - The configuration service for accessing log settings
   */
  constructor(
    @InjectPinoLogger(HttpLoggingInterceptor.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Intercepts HTTP requests to provide consistent logging with correlation IDs.
   * @param context - The execution context containing request/response objects
   * @param next - The call handler for the next interceptor or route handler
   * @returns Observable of the response with logging side effects
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const correlationId = extractCorrelationId(request);
    const userId = extractUserIdFromJWT(request.headers?.authorization);
    const userInfo = extractUserFromJWT(request.headers?.authorization);
    const startTime = Date.now();

    // Set correlation ID on request for other parts of the app
    request.id = correlationId;

    // Create request context for the entire request lifecycle
    const requestContext: RequestContext = {
      correlationId,
      userId,
      userEmail: userInfo?.email,
      userRole: userInfo?.role,
    };

    // Run the request within the context
    return ContextUtil.run(requestContext, () => {
      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - startTime;
          const contentLengthHeader = response.getHeader('content-length');
          const contentLength = Array.isArray(contentLengthHeader)
            ? contentLengthHeader[0]
            : (contentLengthHeader ?? 0);

          this.logSuccessfulRequest({
            request,
            response,
            correlationId,
            userId,
            contentLength,
            duration,
          });
        }),
        catchError((error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status ?? response.statusCode ?? 500;

          this.logErrorRequest({
            request,
            response,
            correlationId,
            userId,
            statusCode,
            duration,
            errorMessage: error.message,
          });

          throw error;
        }),
      );
    });
  }

  /**
   * Logs successful HTTP requests with correlation ID and performance metrics.
   * @param params - Parameters containing request, response, and timing information
   */
  private logSuccessfulRequest(params: {
    request: FastifyRequest;
    response: FastifyReply;
    correlationId: string;
    userId: string;
    contentLength: number | string;
    duration: number;
  }): void {
    const { request, response, correlationId, userId, contentLength, duration } = params;
    const baseMessage = `${request.method} ${request.url} - ${response.statusCode} [${contentLength}b](${duration}ms)`;

    this.logWithContext({
      correlationId,
      userId,
      level: 'info',
      message: baseMessage,
      context: {
        request,
        response,
        duration,
        contentLength,
      },
    });
  }

  /**
   * Logs failed HTTP requests with error details and correlation ID.
   * @param params - Parameters containing request, error, and timing information
   */
  private logErrorRequest(params: {
    request: FastifyRequest;
    response: FastifyReply;
    correlationId: string;
    userId: string;
    statusCode: number;
    duration: number;
    errorMessage: string;
  }): void {
    const { request, correlationId, userId, statusCode, duration, errorMessage } = params;
    const baseMessage = `${request.method} ${request.url} - ${statusCode} - ${errorMessage}`;

    this.logWithContext({
      correlationId,
      userId,
      level: 'error',
      message: baseMessage,
      context: {
        request,
        statusCode,
        duration,
        errorMessage,
      },
    });
  }

  /**
   * Logs messages with correlation context and configurable detail level.
   * @param params - Parameters containing correlation ID, user ID, log level, message, and context
   */
  private logWithContext(params: {
    correlationId: string;
    userId: string;
    level: 'info' | 'error';
    message: string;
    context: {
      request: FastifyRequest;
      response?: FastifyReply;
      duration: number;
      contentLength?: number | string;
      statusCode?: number;
      errorMessage?: string;
    };
  }): void {
    const { correlationId, userId, level, message, context } = params;
    const logConfig = this.configService.get('log');
    const httpDetails = logConfig?.httpDetails ?? 'basic';

    // Create child logger with correlation context
    const contextLogger = this.logger.logger.child({
      correlationId,
      userId,
    });

    const logData = this.buildLogData(httpDetails, context);

    if (level === 'error') {
      if (logData) {
        contextLogger.error(logData, message);
      } else {
        contextLogger.error(message);
      }
    } else {
      if (logData) {
        contextLogger.info(logData, message);
      } else {
        contextLogger.info(message);
      }
    }
  }

  /**
   * Builds log data object based on configured HTTP detail level.
   * @param httpDetails - The level of HTTP details to include ('none', 'basic', 'full')
   * @param context - The request/response context information
   * @returns Log data object or undefined if no details should be logged
   */
  private buildLogData(
    httpDetails: string,
    context: {
      request: FastifyRequest;
      response?: FastifyReply;
      duration: number;
      contentLength?: number | string;
      statusCode?: number;
    },
  ): Record<string, unknown> | undefined {
    const { request, response, duration, contentLength, statusCode } = context;

    if (httpDetails === 'none') {
      return undefined;
    }

    const baseHttpData = {
      method: request.method,
      url: request.url,
      statusCode: statusCode ?? response?.statusCode,
      contentLength,
      duration,
      userAgent: typeof request.headers['user-agent'] === 'string' 
        ? request.headers['user-agent'] 
        : undefined,
    };

    if (httpDetails === 'basic') {
      return { http: baseHttpData };
    }

    if (httpDetails === 'full') {
      return {
        http: {
          ...baseHttpData,
          headers: this.sanitizeHeaders(request.headers),
          query: request.query,
          params: request.params,
          ip: request.ip,
        },
        response: response
          ? {
              headers: this.sanitizeResponseHeaders(response.getHeaders()),
            }
          : undefined,
      };
    }

    return undefined;
  }

  /**
   * Sanitizes request headers by removing sensitive information
   */
  private sanitizeHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string> {
    const REDACTED = '[REDACTED]';
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;

      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);

      // Remove or redact sensitive headers
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'authorization') {
        Object.assign(sanitized, { [key]: REDACTED });
      } else if (lowerKey === 'cookie') {
        Object.assign(sanitized, { [key]: REDACTED });
      } else if (lowerKey === 'x-api-key') {
        Object.assign(sanitized, { [key]: REDACTED });
      } else {
        Object.assign(sanitized, { [key]: stringValue });
      }
    }

    return sanitized;
  }

  /**
   * Sanitizes response headers by removing sensitive information
   */
  private sanitizeResponseHeaders(
    headers: Record<string, string | number | string[] | undefined>,
  ): Record<string, string> {
    const REDACTED = '[REDACTED]';
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;

      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);

      // Remove sensitive response headers if any
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'set-cookie') {
        Object.assign(sanitized, { [key]: REDACTED });
      } else {
        Object.assign(sanitized, { [key]: stringValue });
      }
    }

    return sanitized;
  }
}
