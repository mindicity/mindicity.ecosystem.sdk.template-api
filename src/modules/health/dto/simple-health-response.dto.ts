import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SimpleHealthResponseSchema = z.object({
  status: z.string().describe('Basic health status'),
  version: z.string().describe('Application version'),
});

/**
 * Response DTO for simple health check endpoint.
 * Contains basic application status and version information.
 */
export class SimpleHealthResponseDto extends createZodDto(SimpleHealthResponseSchema) {}