import { Module } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

/**
 * TemplateModule provides greeting functionality and weather data with context-aware logging.
 * Imports DatabaseModule for raw PostgreSQL query capabilities.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [TemplateController],
  providers: [TemplateService, ContextLoggerService],
})
export class TemplateModule {}
