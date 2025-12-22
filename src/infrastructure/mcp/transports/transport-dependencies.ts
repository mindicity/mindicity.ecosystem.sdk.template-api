import { HealthService } from '../../../modules/health/health.service';

/**
 * Dependencies container for MCP transports.
 * 
 * This interface defines all services that MCP transports might need.
 * It provides a clean, scalable way to inject multiple services without 
 * cluttering the factory method signature.
 * 
 * **SCALABILITY PATTERN:**
 * When you need to add new services (UserService, NotificationService, etc.),
 * simply add them to this interface. The factory method signature stays the same,
 * and you can inject as many services as needed without breaking existing code.
 * 
 * @example
 * ```typescript
 * // Current usage (1 service)
 * const dependencies: TransportDependencies = {
 *   healthService: this.healthService,
 * };
 * 
 * // Future usage (multiple services) - same factory signature!
 * const dependencies: TransportDependencies = {
 *   healthService: this.healthService,
 *   userService: this.userService,
 *   notificationService: this.notificationService,
 *   analyticsService: this.analyticsService,
 *   databaseService: this.databaseService,
 * };
 * 
 * // Factory call remains the same regardless of service count
 * TransportFactory.createTransport(config, dependencies);
 * ```
 */
export interface TransportDependencies {
  /**
   * Health service for centralized health data.
   * Required by HTTP and SSE transports for get_api_health tool.
   */
  healthService: HealthService;

  // Future services can be added here as needed:
  // The factory signature never changes - just extend this interface!
  
  /**
   * User service for user-related MCP tools.
   * Example tools: get_current_user, list_users, create_user, etc.
   */
  // userService?: UserService;
  
  /**
   * Notification service for notification-related MCP tools.
   * Example tools: send_notification, list_notifications, mark_read, etc.
   */
  // notificationService?: NotificationService;
  
  /**
   * Analytics service for analytics-related MCP tools.
   * Example tools: get_analytics, track_event, generate_report, etc.
   */
  // analyticsService?: AnalyticsService;
  
  /**
   * Database service for database-related MCP tools.
   * Example tools: execute_query, get_schema, backup_data, etc.
   */
  // databaseService?: DatabaseService;

  /**
   * File service for file-related MCP tools.
   * Example tools: upload_file, list_files, delete_file, etc.
   */
  // fileService?: FileService;

  /**
   * Email service for email-related MCP tools.
   * Example tools: send_email, list_templates, schedule_email, etc.
   */
  // emailService?: EmailService;
}

/**
 * Type for optional transport dependencies.
 * Used when not all transports require all services.
 * 
 * This allows for flexible dependency injection where transports
 * can specify only the services they actually need.
 */
export type OptionalTransportDependencies = Partial<TransportDependencies>;

/**
 * Helper function to create transport dependencies with validation.
 * 
 * This function provides a type-safe way to create dependencies and
 * can include validation logic for required services.
 * 
 * @param services - Object containing the services to include
 * @returns Validated TransportDependencies object
 * 
 * @example
 * ```typescript
 * // Create dependencies with validation
 * const dependencies = createTransportDependencies({
 *   healthService: this.healthService,
 *   userService: this.userService,
 * });
 * 
 * // Use with factory
 * const transport = TransportFactory.createTransport(config, dependencies);
 * ```
 */
export function createTransportDependencies(
  services: OptionalTransportDependencies
): OptionalTransportDependencies {
  // Validate that required services are present
  if (!services.healthService) {
    throw new Error('HealthService is required for MCP transports');
  }

  // Future validation logic can be added here
  // For example, checking if certain service combinations are valid
  // or validating service interfaces
  
  return services;
}

/**
 * Helper function to validate transport dependencies for specific transport types.
 * 
 * @param transportType - The type of transport being created
 * @param dependencies - The dependencies to validate
 * @throws Error if required dependencies are missing for the transport type
 * 
 * @example
 * ```typescript
 * validateTransportDependencies('http', dependencies);
 * ```
 */
export function validateTransportDependencies(
  transportType: string,
  dependencies?: OptionalTransportDependencies
): void {
  if (transportType === 'http' || transportType === 'sse') {
    if (!dependencies?.healthService) {
      throw new Error(`${transportType.toUpperCase()} transport requires HealthService in dependencies`);
    }
  }

  // Future transport-specific validation can be added here
  // For example:
  // if (transportType === 'websocket' && !dependencies?.userService) {
  //   throw new Error('WebSocket transport requires UserService for authentication');
  // }
}