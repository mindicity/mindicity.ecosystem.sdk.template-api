import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ROUTES } from '../../config/routes.config';

import { HealthResponseDto } from './dto/health-response.dto';
import { SimpleHealthResponseDto } from './dto/simple-health-response.dto';
import { HealthService } from './health.service';

/**
 * Controller for Health Check API endpoints.
 * Provides system health status and version information.
 */
@ApiTags('health')
@Controller(ROUTES.HEALTH)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Returns the basic health status of the application.
   * @returns Simple health response DTO with status and version information
   */
  @Get('ping')
  @ApiOperation({ summary: 'Basic health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Basic health status',
    type: SimpleHealthResponseDto,
  })
  ping(): SimpleHealthResponseDto {
    return this.healthService.getSimpleHealthStatus();
  }

  /**
   * Returns comprehensive health status of the application.
   * @returns Detailed health response DTO with status, server info, and system metrics
   */
  @Get('status')
  @ApiOperation({ summary: 'Comprehensive health status endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive health status with system metrics',
    type: HealthResponseDto,
  })
  status(): HealthResponseDto {
    return this.healthService.getHealthStatus();
  }
}
