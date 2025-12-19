import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
});

/**
 * Response DTO for health check endpoint.
 * Contains application status and version information.
 */
export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}
