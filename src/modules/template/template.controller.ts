import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ROUTES } from '../../config/routes.config';

import { TemplateService } from './template.service';

/**
 * Controller for Template API endpoints.
 * Uses ContextLoggerService for automatic correlation ID and user ID logging.
 */
@ApiTags('template')
@ApiBearerAuth()
@Controller(ROUTES.TEMPLATE)
export class TemplateController {
  /**
   * Creates an instance of TemplateController.
   * @param templateService - The template service for business logic
   * @param logger - The context logger service for logging operations
   */
  constructor(
    private readonly templateService: TemplateService,
    private readonly logger: ContextLoggerService,
  ) {
    this.logger.setContext(TemplateController.name);
  }

  // Placeholder for template endpoints
}
