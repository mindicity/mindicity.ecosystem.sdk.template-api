import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context interface for storing correlation ID and user information
 * throughout the request lifecycle.
 */
export interface RequestContext {
  correlationId: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
}

/**
 * AsyncLocalStorage instance for maintaining request context
 * across async operations within a single request.
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Context utility class for managing request-scoped data
 * like correlation IDs and user information.
 */
export class ContextUtil {
  /**
   * Sets the request context for the current async execution context.
   * This should be called at the beginning of each HTTP request.
   *
   * @param context - The request context to set
   * @param callback - The function to execute within this context
   */
  static run<T>(context: RequestContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Gets the current request context.
   * Returns undefined if called outside of a request context.
   *
   * @returns The current request context or undefined
   */
  static getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Gets the correlation ID from the current request context.
   *
   * @returns The correlation ID or 'system' if not in request context
   */
  static getCorrelationId(): string {
    const context = asyncLocalStorage.getStore();
    return context?.correlationId ?? 'system';
  }

  /**
   * Gets the user ID from the current request context.
   *
   * @returns The user ID or 'system' if not in request context
   */
  static getUserId(): string {
    const context = asyncLocalStorage.getStore();
    return context?.userId ?? 'system';
  }

  /**
   * Gets the user email from the current request context.
   *
   * @returns The user email or undefined if not available
   */
  static getUserEmail(): string | undefined {
    const context = asyncLocalStorage.getStore();
    return context?.userEmail;
  }

  /**
   * Gets the user role from the current request context.
   *
   * @returns The user role or undefined if not available
   */
  static getUserRole(): string | undefined {
    const context = asyncLocalStorage.getStore();
    return context?.userRole;
  }

  /**
   * Updates the current request context with new values.
   * Only updates provided fields, keeps existing values for others.
   *
   * @param updates - Partial context updates
   */
  static updateContext(updates: Partial<RequestContext>): void {
    const currentContext = asyncLocalStorage.getStore();
    if (currentContext) {
      Object.assign(currentContext, updates);
    }
  }

  /**
   * Creates a formatted log prefix with correlation ID and user ID.
   * Useful for manual log formatting in services.
   *
   * @returns Formatted string like "[correlationId](userId)"
   */
  static getLogPrefix(): string {
    const correlationId = ContextUtil.getCorrelationId();
    const userId = ContextUtil.getUserId();
    return `[${correlationId}](${userId})`;
  }
}
