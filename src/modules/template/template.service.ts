import { Injectable } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseService } from '../../infrastructure/database/database.service';

/**
 * TemplateService provides greeting functionality with automatic correlation logging.
 * Demonstrates how to use ContextLoggerService for consistent logging across services.
 */
@Injectable()
export class TemplateService {
  private readonly logger: ContextLoggerService;

  /**
   * Creates an instance of TemplateService with a child logger.
   * @param loggerService - The context logger service for logging operations
   * @param databaseService - The database service for raw SQL queries
   */
  constructor(
    loggerService: ContextLoggerService,
    private readonly databaseService: DatabaseService,
  ) {
    // Create a child logger instance for this service with its own context
    this.logger = loggerService.child({ serviceContext: TemplateService.name });
    this.logger.setContext(TemplateService.name);
  }

  // Placeholder for template service methods
}
