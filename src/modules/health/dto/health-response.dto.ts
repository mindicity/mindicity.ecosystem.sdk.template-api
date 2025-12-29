import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const HealthResponseSchema = z.object({
  status: z.string().describe('Health status of the application'),
  timestamp: z.string().describe('ISO timestamp when health check was performed'),
  server: z.string().describe('Server/application name'),
  version: z.string().describe('Application version'),
  uptime: z.number().describe('Server uptime in seconds'),
  memory: z.object({
    rss: z.number().describe('Resident Set Size - total memory allocated'),
    heapTotal: z.number().describe('Total heap memory allocated'),
    heapUsed: z.number().describe('Heap memory currently used'),
    external: z.number().describe('Memory used by C++ objects bound to JavaScript'),
    arrayBuffers: z.number().describe('Memory allocated for ArrayBuffers and SharedArrayBuffers'),
  }).describe('Memory usage statistics'),
  environment: z.string().describe('Current environment (development, production, etc.)'),
});

/**
 * Response DTO for comprehensive health check endpoint.
 * Contains detailed application status, server information, and system metrics.
 */
export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
