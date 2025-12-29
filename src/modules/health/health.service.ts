import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { HealthResponseDto } from './dto/health-response.dto';

/**
 * Health Service provides comprehensive health check functionality.
 * 
 * This service generates detailed health information including:
 * - Application status
 * - Server information
 * - System metrics (uptime, memory usage)
 * - Timestamp information
 */
@Injectable()
export class HealthService {
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly configService: ConfigService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: HealthService.name });
    this.logger.setContext(HealthService.name);
  }

  /**
   * Get comprehensive health status of the application.
   * 
   * @returns Detailed health information including status, server info, and system metrics
   */
  getHealthStatus(): HealthResponseDto {
    this.logger.trace('getHealthStatus()');

    const packageInfo = this.configService.get('package');

    const healthData: HealthResponseDto = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: packageInfo?.name ?? 'template-api',
      version: packageInfo?.version ?? '0.0.1',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV ?? 'development',
    };

    return healthData;
  }

  /**
   * Get simple health status for basic health checks.
   * 
   * @returns Basic health information with status and version
   */
  getSimpleHealthStatus(): { status: string; version: string } {
    this.logger.trace('getSimpleHealthStatus()');

    const packageInfo = this.configService.get('package');

    return {
      status: 'ok',
      version: packageInfo?.version ?? '1.0.0',
    };
  }
}