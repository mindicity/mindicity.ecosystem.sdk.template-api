import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/**
 * HealthModule provides health check endpoints for monitoring application status.
 * Contains endpoints for system health verification and version information.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
