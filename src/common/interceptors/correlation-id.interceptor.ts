import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';

import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interceptor that generates or uses existing correlation IDs for request tracing.
 * Adds correlation ID to request headers and response headers for tracking.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  /**
   * Intercepts incoming requests to ensure correlation ID is present.
   * @param context - The execution context containing request/response objects
   * @param next - The call handler for the next interceptor or route handler
   * @returns Observable of the response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Generate or use existing correlation ID as UUID
    request.id = request.headers['x-correlation-id'] ?? uuidv4();

    // Add to response headers
    const response = context.switchToHttp().getResponse();
    response.header('x-correlation-id', request.id);

    return next.handle();
  }
}
