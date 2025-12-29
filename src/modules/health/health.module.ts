import { Module } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * HealthModule provides health check endpoints for monitoring application status.
 * Contains endpoints for system health verification and version information.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService, ContextLoggerService],
  exports: [HealthService],
})
export class HealthModule {}
