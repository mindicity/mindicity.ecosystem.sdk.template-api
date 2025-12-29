import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

import { BaseException } from '../exceptions/base.exception';

/**
 * Global exception filter that catches all exceptions and formats them consistently.
 * Provides structured error responses with correlation IDs and optional debug information.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Creates an instance of HttpExceptionFilter.
   * @param logger - The Pino logger instance for logging errors
   * @param configService - The configuration service for accessing app settings
   */
  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main exception handler that catches all exceptions and formats them consistently.
   * @param exception - The exception that was thrown
   * @param host - The arguments host containing request/response context
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status = this.getHttpStatus(exception);
    const { errorType, errorCode } = this.getErrorTypeAndCode(exception, status);
    const correlationId = this.getCorrelationId(request);

    const errorResponse = this.buildErrorResponse({
      exception,
      correlationId,
      instanceUrl: request.url,
      status,
      errorType,
      errorCode,
    });

    this.logger.error({
      err: exception,
      req: request,
      errorResponse,
    });

    response.status(status).send(errorResponse);
  }

  /**
   * Extracts HTTP status code from exception or defaults to 500.
   * @param exception - The exception to extract status from
   * @returns HTTP status code
   */
  private getHttpStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Determines error type and code based on exception type and HTTP status.
   * @param exception - The exception that was thrown
   * @param status - The HTTP status code
   * @returns Object containing error type and error code
   */
  private getErrorTypeAndCode(
    exception: unknown,
    status: number,
  ): { errorType: string; errorCode: string } {
    const isBaseException = exception instanceof BaseException;

    if (isBaseException) {
      return { errorType: exception.type, errorCode: exception.errcode };
    }

    switch (status) {
      case HttpStatus.NOT_FOUND:
        return { errorType: 'NotFoundError', errorCode: 'app-00404' };
      case HttpStatus.BAD_REQUEST:
        return { errorType: 'ValidationError', errorCode: 'app-00400' };
      case HttpStatus.UNAUTHORIZED:
        return { errorType: 'UnauthorizedError', errorCode: 'app-00401' };
      case HttpStatus.FORBIDDEN:
        return { errorType: 'ForbiddenError', errorCode: 'app-00403' };
      default:
        return { errorType: 'InternalServerError', errorCode: 'app-00500' };
    }
  }

  /**
   * Extracts correlation ID from request headers or generates a new one.
   * @param request - The Fastify request object
   * @returns Correlation ID string
   */
  private getCorrelationId(request: FastifyRequest): string {
    return (request.headers['x-correlation-id'] as string) ?? request.id ?? uuidv4();
  }

  /**
   * Builds a standardized error response object with optional details.
   * @param params - Parameters containing exception details and configuration
   * @returns Formatted error response object
   */
  private buildErrorResponse(params: {
    exception: unknown;
    correlationId: string;
    instanceUrl: string;
    status: number;
    errorType: string;
    errorCode: string;
  }): Record<string, unknown> {
    const { exception, correlationId, instanceUrl, status, errorType, errorCode } = params;
    const showDetail = this.configService.get<boolean>('app.errDetail');
    const showMessage = this.configService.get<boolean>('app.errMessage');

    const errorResponse: Record<string, unknown> = {
      id: correlationId,
      instance: instanceUrl,
      status,
      type: errorType,
      errcode: errorCode,
    };

    if (showMessage) {
      errorResponse.message =
        exception instanceof Error ? exception.message : 'Internal server error';
    }

    if (showDetail) {
      errorResponse.detail = {
        message: exception instanceof Error ? exception.message : 'Unknown error',
        stack: this.parseStack(exception instanceof Error ? (exception.stack ?? '') : ''),
      };
    }

    return errorResponse;
  }

  /**
   * Parses a stack trace string into structured stack frame objects.
   * @param stack - The stack trace string to parse
   * @returns Array of parsed stack frame objects
   */
  private parseStack(stack: string): Array<{
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    functionName: string;
    source: string;
  }> {
    if (!stack) return [];

    return stack
      .split('\n')
      .slice(1)
      .map((line) => {
        const match = line.match(/at (.+?) \((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            functionName: match[1].trim(),
            fileName: match[2],
            lineNumber: parseInt(match[3], 10),
            columnNumber: parseInt(match[4], 10),
            source: line.trim(),
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
