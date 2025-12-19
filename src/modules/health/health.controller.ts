import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ROUTES } from '../../config/routes.config';

import { HealthResponseDto } from './dto/health-response.dto';

/**
 * Controller for Health Check API endpoints.
 * Provides system health status and version information.
 */
@ApiTags('health')
@Controller(ROUTES.HEALTH)
export class HealthController {
  /**
   * Returns the health status of the application.
   * @returns Health response DTO with status and version information
   */
  @Get('ping')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    type: HealthResponseDto,
  })
  ping(): HealthResponseDto {
    return {
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }
}
